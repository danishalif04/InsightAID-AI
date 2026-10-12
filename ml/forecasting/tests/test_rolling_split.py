from src.rolling_split import rolling_origin_splits


def test_produces_non_overlapping_growing_train_windows():
    folds = rolling_origin_splits(n_observations=100, initial_train_size=50, horizon=10, step=10)
    assert len(folds) == 5
    assert list(folds[0].train_index) == list(range(0, 50))
    assert list(folds[0].test_index) == list(range(50, 60))
    assert list(folds[1].train_index) == list(range(0, 60))
    assert list(folds[1].test_index) == list(range(60, 70))


def test_train_never_overlaps_its_own_test_window():
    folds = rolling_origin_splits(n_observations=80, initial_train_size=30, horizon=5, step=5)
    for fold in folds:
        assert max(fold.train_index) < min(fold.test_index)


def test_step_defaults_to_horizon():
    folds = rolling_origin_splits(n_observations=60, initial_train_size=40, horizon=5)
    assert list(folds[1].train_index) == list(range(0, 45))


def test_max_folds_caps_output():
    folds = rolling_origin_splits(n_observations=200, initial_train_size=20, horizon=5, max_folds=3)
    assert len(folds) == 3


def test_raises_when_no_fold_fits():
    try:
        rolling_origin_splits(n_observations=10, initial_train_size=20, horizon=5)
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_invalid_arguments_raise():
    for kwargs in [
        dict(n_observations=10, initial_train_size=0, horizon=5),
        dict(n_observations=10, initial_train_size=5, horizon=0),
        dict(n_observations=10, initial_train_size=5, horizon=2, step=0),
    ]:
        try:
            rolling_origin_splits(**kwargs)
            assert False, f"expected ValueError for {kwargs}"
        except ValueError:
            pass
