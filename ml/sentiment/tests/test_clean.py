from src.clean import detect_language, extract_hashtags, extract_mentions, preprocess_text


def test_detect_language_english():
    assert detect_language("This is a great product and I have used it a lot") == "en"


def test_detect_language_malay():
    assert detect_language("Saya tak suka barang ini, memang tidak berbaloi langsung") == "ms"


def test_detect_language_mandarin():
    assert detect_language("这个产品非常好用我很喜欢") == "zh"


def test_detect_language_code_mixed():
    text = "This product memang sangat bagus and saya suka it a lot dengan harga ini"
    assert detect_language(text) == "ms-en"


def test_detect_language_unknown_for_empty():
    assert detect_language("") == "unknown"
    assert detect_language("   ") == "unknown"


def test_detect_language_unknown_for_no_function_words():
    assert detect_language("12345 !!! ###") == "unknown"


def test_preprocess_strips_urls():
    result = preprocess_text("Check this out https://example.com/page and www.test.com now")
    assert "http" not in result.cleaned_text
    assert "www." not in result.cleaned_text
    assert result.has_url is True


def test_preprocess_strips_retweet_prefix():
    result = preprocess_text("RT @someone: this is the actual content")
    assert result.cleaned_text == "this is the actual content"


def test_preprocess_caps_repeated_letters():
    result = preprocess_text("this is soooooooo good")
    assert "soooooooo" not in result.cleaned_text
    assert "sooo" in result.cleaned_text
    assert result.has_repeated_chars is True


def test_preprocess_keeps_hashtags_and_mentions_in_text_but_extracts_them():
    result = preprocess_text("Loving this @brand product #amazing #musthave")
    assert "@brand" in result.cleaned_text
    assert "#amazing" in result.cleaned_text
    assert extract_hashtags("Loving this @brand product #amazing #musthave") == ["amazing", "musthave"]
    assert extract_mentions("Loving this @brand product #amazing #musthave") == ["brand"]


def test_preprocess_preserves_raw_text_untouched():
    raw = "RT @someone: check https://example.com soooooo good"
    result = preprocess_text(raw)
    assert result.raw_text == raw
    assert result.cleaned_text != raw


def test_preprocess_handles_none_input():
    result = preprocess_text(None)
    assert result.raw_text == ""
    assert result.cleaned_text == ""
    assert result.language == "unknown"
