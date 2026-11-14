import json
import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.build_features import FORBIDDEN_FEATURES
from src.generate_dataset import MEASUREMENT_CHANNELS, MEASUREMENT_COLUMNS
from src.validate_dataset import _check_reproducibility


class DatasetValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = json.loads(
            (ROOT / "config" / "dataset_config.json").read_text(encoding="utf-8")
        )
        cls.raw = pd.read_csv(ROOT / "data" / "raw" / "engine_twin_v0.2_raw.csv")
        cls.manifest = pd.read_csv(
            ROOT / "metadata" / "scenario_manifest.csv"
        )
        cls.engines = pd.read_csv(ROOT / "metadata" / "engine_manifest.csv")
        cls.features = pd.read_csv(ROOT / "data" / "processed" / "features.csv")
        cls.labels = pd.read_csv(ROOT / "data" / "processed" / "labels.csv")
        cls.lineage = pd.read_csv(
            ROOT / "data" / "processed" / "feature_lineage.csv"
        )

    def test_scenario_and_engine_partitions_are_disjoint(self):
        for field, values in (
            ("scenario_split", ("train", "validation", "scenario_test")),
            ("engine_split", ("train", "validation", "test")),
        ):
            sets = {
                value: set(
                    self.manifest.loc[self.manifest[field] == value, "scenario_id"]
                    if field == "scenario_split"
                    else self.engines.loc[
                        self.engines[field] == value, "engine_id"
                    ]
                )
                for value in values
            }
            for left, right in (
                (values[0], values[1]),
                (values[0], values[2]),
                (values[1], values[2]),
            ):
                self.assertFalse(sets[left] & sets[right], f"{field} overlap: {left}/{right}")

    def test_all_faults_cross_all_phases_and_splits(self):
        cross = pd.crosstab(self.manifest.fault_type, self.manifest.operating_phase)
        self.assertEqual(set(cross.index), set(self.config["fault_classes"]))
        self.assertEqual(set(cross.columns), set(self.config["phases"]))
        self.assertTrue(cross.gt(0).all().all())
        for split in ("train", "validation", "scenario_test"):
            part = self.manifest.loc[self.manifest.scenario_split == split]
            self.assertEqual(set(part.fault_type), set(self.config["fault_classes"]))
            self.assertEqual(set(part.operating_phase), set(self.config["phases"]))
            cross = pd.crosstab(part.fault_type, part.operating_phase)
            self.assertTrue(cross.gt(0).all().all(), f"Missing {split} fault/phase pair")
        for split in ("train", "validation", "test"):
            part = self.manifest.loc[self.manifest.engine_split == split]
            self.assertEqual(set(part.fault_type), set(self.config["fault_classes"]))
            self.assertEqual(set(part.operating_phase), set(self.config["phases"]))
            cross = pd.crosstab(part.fault_type, part.operating_phase)
            self.assertTrue(cross.gt(0).all().all(), f"Missing engine {split} fault/phase pair")

    def test_fault_onset_and_sensor_targets_agree_with_semantics(self):
        expected = (
            self.raw.fault_type.ne("normal")
            & self.raw.fault_onset_s.notna()
            & self.raw.time_s.ge(self.raw.fault_onset_s)
        ).astype("int8")
        np.testing.assert_array_equal(self.raw.fault_active.to_numpy(), expected.to_numpy())
        self.assertTrue(
            self.raw.loc[self.raw.fault_type == "normal", "fault_onset_s"]
            .isna()
            .all()
        )
        self.assertTrue(
            self.raw.loc[self.raw.fault_type == "normal", "fault_severity"]
            .eq("none")
            .all()
        )
        sensor_fault = self.raw.fault_type.str.startswith("sensor_")
        self.assertTrue(self.raw.loc[sensor_fault, "sensor_fault_target"].ne("").all())
        self.assertTrue(
            self.raw.loc[~sensor_fault, "sensor_fault_target"]
            .fillna("")
            .eq("")
            .all()
        )
        self.assertTrue(self.raw.rul_hours.isna().all())

    def test_environment_and_mechanical_identities(self):
        constants = self.config["assumption_constants"]
        expected_density = self.raw.ambient_pressure_pa / (
            constants["dry_air_gas_constant_j_kg_k"]
            * (self.raw.ambient_temp_c + 273.15)
        )
        np.testing.assert_allclose(
            self.raw.air_density_kg_m3, expected_density, rtol=2e-8, atol=2e-8
        )
        expected_power_w = (
            self.raw.state_torque_nm
            * self.raw.state_rpm
            * (2 * np.pi / 60.0)
        )
        np.testing.assert_allclose(
            self.raw.state_power_kw * 1000.0,
            expected_power_w,
            rtol=1e-12,
            atol=1e-9,
        )
        self.assertTrue((self.raw.state_oil_pressure_kpa > 0).all())

    def test_sensor_faults_do_not_change_latent_state(self):
        sensor_fault = self.raw.fault_type.str.startswith("sensor_")
        for _, (state_column, reference_column) in MEASUREMENT_CHANNELS.items():
            np.testing.assert_allclose(
                self.raw.loc[sensor_fault, state_column],
                self.raw.loc[sensor_fault, reference_column],
                rtol=1e-12,
                atol=1e-10,
            )

    def test_bias_drift_and_stuck_faults_affect_the_declared_sensor(self):
        severity_levels = self.config["severity_levels"]
        noise = self.config["sensor_noise_standard_deviation"]
        magnitudes = self.config["sensor_fault_bias_magnitudes_by_severity_level"]
        sensor_faults = self.raw.loc[
            self.raw.fault_type.isin(["sensor_bias", "sensor_drift", "sensor_stuck"])
        ]
        for _, scenario in sensor_faults.groupby("scenario_id", sort=False):
            fault_type = scenario.fault_type.iloc[0]
            target = scenario.sensor_fault_target.iloc[0]
            onset = int(scenario.fault_onset_s.iloc[0])
            level = severity_levels[scenario.fault_severity.iloc[0]]
            measured_column = MEASUREMENT_COLUMNS[target]
            reference_column = MEASUREMENT_CHANNELS[target][1]
            measured = scenario[measured_column].to_numpy()

            if fault_type == "sensor_stuck":
                self.assertGreater(onset, 0)
                np.testing.assert_array_equal(
                    measured[onset:], np.repeat(measured[onset - 1], len(measured) - onset)
                )
                continue

            residual = measured - scenario[reference_column].to_numpy()
            expected_offset = magnitudes[target] * level
            tolerance = 8 * noise[target]
            if fault_type == "sensor_bias":
                self.assertLessEqual(
                    abs(np.median(residual[onset:]) - expected_offset), tolerance
                )
            else:
                self.assertLessEqual(
                    abs(np.median(residual[onset : onset + 10])), tolerance
                )
                self.assertLessEqual(
                    abs(np.median(residual[-10:]) - expected_offset), tolerance
                )

    def test_dropout_missingness_is_marked_and_targeted(self):
        measurements = list(MEASUREMENT_COLUMNS.values())
        target_by_measurement = {
            measurement: target
            for target, measurement in MEASUREMENT_COLUMNS.items()
        }
        missing = self.raw[measurements].isna()
        rows, columns = np.where(missing.to_numpy())
        self.assertGreater(len(rows), 0)
        for row_index, column_index in zip(rows, columns):
            row = self.raw.iloc[row_index]
            self.assertEqual(row.fault_type, "sensor_dropout")
            self.assertEqual(row.fault_active, 1)
            self.assertEqual(row.measurement_missing_reason, "injected_sensor_dropout")
            self.assertEqual(
                row.sensor_fault_target, target_by_measurement[measurements[column_index]]
            )
        self.assertTrue(
            self.raw.loc[~missing.any(axis=1), "measurement_missing_reason"]
            .fillna("")
            .eq("")
            .all()
        )

    def test_feature_matrix_excludes_ids_and_target_leakage(self):
        self.assertFalse(FORBIDDEN_FEATURES.intersection(self.features.columns))
        self.assertFalse({"scenario_id", "engine_id"}.intersection(self.features.columns))
        self.assertTrue(
            all(pd.api.types.is_numeric_dtype(self.features[column]) for column in self.features)
        )
        np.testing.assert_array_equal(
            self.lineage.raw_row_index.to_numpy(), np.arange(len(self.raw))
        )
        np.testing.assert_array_equal(
            self.labels.fault_type.to_numpy(), self.raw.fault_type.to_numpy()
        )

    def test_scenario_ids_are_opaque_random_tokens(self):
        ids = self.raw.scenario_id.astype(str)
        self.assertTrue(ids.str.fullmatch(r"[0-9a-f]{16}").all())
        self.assertEqual(ids.nunique(), self.raw.scenario_id.nunique())
        self.assertFalse(ids.str.fullmatch(r"SCN\d+").any())

    def test_same_config_reproduces_all_generated_files(self):
        results = _check_reproducibility(ROOT)
        self.assertTrue(results)
        self.assertTrue(all(status == "PASS" for status in results.values()), results)


if __name__ == "__main__":
    unittest.main()
