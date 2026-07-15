-- InsightAid AI — demo data seed
-- Run once, AFTER you've signed up through the app's /signup page.
-- Edit the email on the line below to match the account you just created,
-- then run this whole file in the Supabase Dashboard -> SQL Editor.

do $$
declare
  v_user_id uuid;
  v_rec1 uuid := gen_random_uuid();
  v_rec2 uuid := gen_random_uuid();
  v_rec3 uuid := gen_random_uuid();
  v_rec4 uuid := gen_random_uuid();
  v_rec5 uuid := gen_random_uuid();
  v_rec6 uuid := gen_random_uuid();
begin
  select id into v_user_id from auth.users where email = 'admin@insightaid.ai' limit 1;
  if v_user_id is null then
    raise exception 'No auth.users row found for that email — sign up through /signup first, then fix the email above.';
  end if;

  -- Settings ------------------------------------------------------------
  insert into public.profiles (id, full_name, email, role, phone)
  values (v_user_id, 'Admin User', 'admin@insightaid.ai', 'Founder', '+60 12-345 6789')
  on conflict (id) do update set full_name = excluded.full_name, role = excluded.role, phone = excluded.phone;

  insert into public.companies (user_id, name, industry, size, website)
  values (v_user_id, 'InsightAid Sdn Bhd', 'Data Analytics / SaaS', '1–10 employees', 'https://insightaid.ai');

  insert into public.user_preferences (user_id, notifications, language, theme, model_config, backup_frequency)
  values (
    v_user_id,
    '{"email-alerts": true, "crisis-alerts": true, "weekly-report": true, "product-updates": false}'::jsonb,
    'en', 'light',
    '{"sentimentModel": "XLM-RoBERTa v2.1", "confidenceThreshold": 75, "crisisSensitivity": "medium"}'::jsonb,
    'daily'
  )
  on conflict (user_id) do update set notifications = excluded.notifications, model_config = excluded.model_config;

  insert into public.api_keys (user_id, name, masked_value) values
    (v_user_id, 'TikTok API Key', 'tk_live_••••••••••••4f2a'),
    (v_user_id, 'X API Key', 'x_live_•••••••••••••9c1e'),
    (v_user_id, 'Internal Database Key', 'idb_•••••••••••••••7b3d');

  -- Dashboard + Sentiment Analysis ---------------------------------------
  insert into public.executive_summary (user_id, headline)
  values (v_user_id, 'Overall sentiment is trending positive at 74.2% (+6.3% WoW), driven by strong TikTok reception of the new product launch. Crisis risk has eased to 18%, but market opportunity softened slightly as a competitor entered the mid-market segment.')
  on conflict (user_id) do update set headline = excluded.headline;

  insert into public.sentiment_daily (user_id, date, positive, neutral, negative) values
    (v_user_id, '2026-06-27', 58, 28, 14),
    (v_user_id, '2026-06-28', 61, 26, 13),
    (v_user_id, '2026-06-29', 59, 29, 12),
    (v_user_id, '2026-06-30', 64, 25, 11),
    (v_user_id, '2026-07-01', 67, 22, 11),
    (v_user_id, '2026-07-02', 63, 25, 12),
    (v_user_id, '2026-07-03', 69, 21, 10),
    (v_user_id, '2026-07-04', 71, 20, 9),
    (v_user_id, '2026-07-05', 68, 22, 10),
    (v_user_id, '2026-07-06', 72, 19, 9),
    (v_user_id, '2026-07-07', 70, 21, 9),
    (v_user_id, '2026-07-08', 73, 19, 8),
    (v_user_id, '2026-07-09', 75, 17, 8),
    (v_user_id, '2026-07-10', 74, 18, 8);

  insert into public.sentiment_posts (user_id, platform, language, text, sentiment, confidence, engagement) values
    (v_user_id, 'tiktok', 'en', 'Just tried the new InsightAid dashboard demo and honestly the crisis detection alerts are a game changer for my small business.', 'positive', 0.94, 18200),
    (v_user_id, 'x', 'ms', 'Penghantaran lambat minggu ni, harap boleh diperbaiki secepat mungkin sebab pelanggan dah mula merungut.', 'negative', 0.87, 6400),
    (v_user_id, 'tiktok', 'zh', '这个产品的包装设计很好看,但是价格对学生党来说有点贵。', 'neutral', 0.71, 4100),
    (v_user_id, 'x', 'en', 'Customer support resolved my refund in under an hour. Genuinely impressed with the response time.', 'positive', 0.91, 9800),
    (v_user_id, 'tiktok', 'ms', 'Produk baru ni memang power, dah order untuk seluruh keluarga!', 'positive', 0.89, 15300),
    (v_user_id, 'x', 'zh', '客服态度冷淡,问题也没有真正解决,有点失望。', 'negative', 0.82, 3200);

  insert into public.emotion_breakdown (user_id, emotion, value) values
    (v_user_id, 'Joy', 38), (v_user_id, 'Trust', 24), (v_user_id, 'Anticipation', 16),
    (v_user_id, 'Surprise', 10), (v_user_id, 'Anger', 7), (v_user_id, 'Sadness', 5);

  insert into public.region_sentiment (user_id, state, score, mentions) values
    (v_user_id, 'Selangor', 78, 4820), (v_user_id, 'Kuala Lumpur', 74, 4310), (v_user_id, 'Penang', 69, 2680),
    (v_user_id, 'Johor', 66, 2150), (v_user_id, 'Sabah', 71, 1240), (v_user_id, 'Sarawak', 73, 1080),
    (v_user_id, 'Perak', 62, 940);

  -- Social Intelligence ---------------------------------------------------
  insert into public.platform_metrics (user_id, platform, mention_volume, virality, engagement, top_language, sentiment_score) values
    (v_user_id, 'tiktok', 11240, 7.8, 9.4, 'Bahasa Melayu', 76),
    (v_user_id, 'x', 7460, 5.2, 4.1, 'English', 68);

  insert into public.mention_volume_daily (user_id, platform, date, mentions) values
    (v_user_id, 'tiktok', '2026-07-06', 1240), (v_user_id, 'tiktok', '2026-07-07', 1380), (v_user_id, 'tiktok', '2026-07-08', 1290),
    (v_user_id, 'tiktok', '2026-07-09', 1510), (v_user_id, 'tiktok', '2026-07-10', 1670), (v_user_id, 'tiktok', '2026-07-11', 1820),
    (v_user_id, 'tiktok', '2026-07-12', 1590),
    (v_user_id, 'x', '2026-07-06', 860), (v_user_id, 'x', '2026-07-07', 910), (v_user_id, 'x', '2026-07-08', 870),
    (v_user_id, 'x', '2026-07-09', 1020), (v_user_id, 'x', '2026-07-10', 1140), (v_user_id, 'x', '2026-07-11', 1260),
    (v_user_id, 'x', '2026-07-12', 1080);

  insert into public.trending_keywords (user_id, keyword, mentions, platform) values
    (v_user_id, 'productlaunch', 3240, null), (v_user_id, 'customerservice', 2110, null), (v_user_id, 'pricing', 1870, null),
    (v_user_id, 'delivery', 1420, null), (v_user_id, 'newfeature', 1180, null), (v_user_id, 'refund', 640, null),
    (v_user_id, 'insightaid', 2680, 'tiktok'), (v_user_id, 'productlaunch', 3240, 'tiktok'),
    (v_user_id, 'customerservice', 2110, 'x'), (v_user_id, 'pricing', 1870, 'x'),
    (v_user_id, 'delivery', 1420, 'tiktok'), (v_user_id, 'newfeature', 1180, 'x');

  insert into public.influencers (user_id, handle, platform, followers, virality, engagement, sentiment) values
    (v_user_id, '@fatinreviews', 'tiktok', 482000, 8.9, 12.4, 'positive'),
    (v_user_id, '@klsavvy', 'x', 156000, 6.1, 5.8, 'neutral'),
    (v_user_id, '@growthwithzul', 'tiktok', 298000, 7.4, 9.7, 'positive'),
    (v_user_id, '@marketwatchmy', 'x', 91000, 4.2, 3.9, 'negative'),
    (v_user_id, '@dailyunbox', 'tiktok', 214000, 6.8, 8.2, 'positive');

  insert into public.social_posts (user_id, platform, text, likes, shares) values
    (v_user_id, 'tiktok', 'This dashboard literally caught our sentiment dip before I even noticed complaints coming in', 24800, 3600),
    (v_user_id, 'x', 'Refund processed in under an hour after I flagged it. Customer service actually reads the feed apparently.', 9100, 1400),
    (v_user_id, 'tiktok', 'Unboxing the new packaging — still think the price is a bit steep for students but quality is solid.', 15600, 2100),
    (v_user_id, 'x', 'Delivery delay again this week. Third time this month, need a real fix not just an apology tweet.', 4200, 2800);

  -- Crisis Detection --------------------------------------------------------
  insert into public.crisis_status (user_id, level, risk_score, negative_spike, mention_spike, anomaly_score, affected_platforms)
  values (v_user_id, 'medium', 42, '+184%', '+92%', '6.4 / 10', 'TikTok, X')
  on conflict (user_id) do update set level = excluded.level, risk_score = excluded.risk_score;

  insert into public.anomaly_hourly (user_id, recorded_date, hour, mentions, threshold) values
    (v_user_id, current_date, '00:00', 210, 260), (v_user_id, current_date, '01:00', 190, 258),
    (v_user_id, current_date, '02:00', 175, 255), (v_user_id, current_date, '03:00', 168, 252),
    (v_user_id, current_date, '04:00', 172, 250), (v_user_id, current_date, '05:00', 188, 250),
    (v_user_id, current_date, '06:00', 240, 252), (v_user_id, current_date, '07:00', 310, 255),
    (v_user_id, current_date, '08:00', 420, 260), (v_user_id, current_date, '09:00', 480, 262),
    (v_user_id, current_date, '10:00', 560, 265), (v_user_id, current_date, '11:00', 690, 268),
    (v_user_id, current_date, '12:00', 820, 270), (v_user_id, current_date, '13:00', 910, 272),
    (v_user_id, current_date, '14:00', 860, 272), (v_user_id, current_date, '15:00', 780, 270),
    (v_user_id, current_date, '16:00', 705, 268), (v_user_id, current_date, '17:00', 640, 265),
    (v_user_id, current_date, '18:00', 590, 263), (v_user_id, current_date, '19:00', 510, 262),
    (v_user_id, current_date, '20:00', 430, 260), (v_user_id, current_date, '21:00', 360, 258),
    (v_user_id, current_date, '22:00', 290, 256), (v_user_id, current_date, '23:00', 245, 255);

  insert into public.crisis_root_cause (user_id, summary, recommended_actions)
  values (
    v_user_id,
    'The spike correlates with a viral TikTok video (2.1M views) reporting delayed deliveries in the Klang Valley area. Negative sentiment concentrated around the keywords "delivery" and "refund" between 08:00 and 15:00, coinciding with a 3rd-party courier outage.',
    array[
      'Issue a public acknowledgement on TikTok and X within the next 2 hours.',
      'Escalate the courier outage with the logistics partner and publish an ETA.',
      'Offer proactive refund/credit to affected orders flagged in the last 48 hours.',
      'Monitor the #delivery hashtag hourly until mention volume returns to baseline.'
    ]
  )
  on conflict (user_id) do update set summary = excluded.summary, recommended_actions = excluded.recommended_actions;

  insert into public.crisis_log (user_id, date, level, trigger, duration, resolution) values
    (v_user_id, '2026-06-22', 'high', 'Payment gateway downtime', '3h 40m', 'Resolved — gateway failover restored service'),
    (v_user_id, '2026-06-08', 'medium', 'Negative review cluster on X', '6h 10m', 'Resolved — customer service follow-up campaign'),
    (v_user_id, '2026-05-19', 'critical', 'Product recall announcement backlash', '1d 4h', 'Resolved — public statement + refund program'),
    (v_user_id, '2026-05-02', 'low', 'Minor shipping delay complaints', '2h 05m', 'Resolved — automatic customer notification');

  -- Forecasting -------------------------------------------------------------
  insert into public.forecast_metrics (user_id, label, display, delta, accuracy) values
    (v_user_id, 'Sales Revenue', 'RM 75,900', 12.4, 91),
    (v_user_id, 'Customer Demand', '8,420 units', 7.8, 86),
    (v_user_id, 'Customer Engagement', '64.2 score', -3.1, 82);

  insert into public.forecast_scenarios (user_id, label, revenue, change_pct, description) values
    (v_user_id, 'best', 'RM 92,400', 22.8, 'Sustained TikTok virality and successful crisis resolution.'),
    (v_user_id, 'expected', 'RM 75,900', 12.4, 'Current trend continues with seasonal demand patterns.'),
    (v_user_id, 'worst', 'RM 58,100', -4.6, 'Prolonged delivery issues suppress repeat purchases.');

  insert into public.forecast_series (user_id, horizon_days, date, actual, forecast, low, band) values
    (v_user_id, 30, '2026-06-27', 57050, null, null, null), (v_user_id, 30, '2026-06-28', 58900, null, null, null),
    (v_user_id, 30, '2026-06-29', 59200, null, null, null), (v_user_id, 30, '2026-06-30', 60100, null, null, null),
    (v_user_id, 30, '2026-07-01', 61500, null, null, null), (v_user_id, 30, '2026-07-02', 62300, null, null, null),
    (v_user_id, 30, '2026-07-03', 63800, null, null, null), (v_user_id, 30, '2026-07-04', 64200, null, null, null),
    (v_user_id, 30, '2026-07-05', 65100, null, null, null), (v_user_id, 30, '2026-07-06', 66400, null, null, null),
    (v_user_id, 30, '2026-07-07', 67200, null, null, null), (v_user_id, 30, '2026-07-08', 68000, null, null, null),
    (v_user_id, 30, '2026-07-09', 68600, null, null, null),
    (v_user_id, 30, '2026-07-10', 67500, 67500, 67500, 0),
    (v_user_id, 30, '2026-07-13', null, 69800, 67200, 5200), (v_user_id, 30, '2026-07-16', null, 71200, 67900, 6600),
    (v_user_id, 30, '2026-07-19', null, 72600, 68100, 9000), (v_user_id, 30, '2026-07-22', null, 73100, 67300, 11600),
    (v_user_id, 30, '2026-07-25', null, 74400, 67200, 14400), (v_user_id, 30, '2026-07-28', null, 75000, 66300, 17400),
    (v_user_id, 30, '2026-07-31', null, 75900, 65900, 20000), (v_user_id, 30, '2026-08-03', null, 76800, 65300, 23000),
    (v_user_id, 30, '2026-08-06', null, 77500, 64600, 25800), (v_user_id, 30, '2026-08-09', null, 78200, 63900, 28600);

  -- AI Recommendations --------------------------------------------------------
  insert into public.recommendations (id, user_id, category, priority, title, impact_score, confidence, roi, timeframe, reasoning) values
    (v_rec1, v_user_id, 'Marketing', 'high', 'Launch a TikTok reply campaign addressing delivery concerns', 82, 88, 34, '1–2 weeks',
      'Sentiment analysis shows 68% of negative mentions this week reference delivery delays, concentrated on TikTok. A direct, visible response from the brand has historically reduced negative sentiment velocity by 40% within 72 hours in similar cases.'),
    (v_rec2, v_user_id, 'Operations', 'high', 'Increase courier capacity in Klang Valley for the next 2 weeks', 76, 91, 21, '3–5 days',
      'Mention volume for "late delivery" is 3.2x baseline in the Klang Valley region specifically, correlating with a known 3rd-party courier outage. Forecast models project continued order volume growth, making capacity the binding constraint.'),
    (v_rec3, v_user_id, 'Product', 'medium', 'Fast-track the requested packaging size variant', 64, 73, 18, '4–6 weeks',
      'A recurring request for a smaller packaging size appears in 12% of neutral/positive posts, primarily from students citing price sensitivity. Estimated addressable segment: ~8,000 mentions/month.'),
    (v_rec4, v_user_id, 'Customer Service', 'medium', 'Add a Mandarin-speaking agent to the support rotation', 58, 80, 14, '2–3 weeks',
      'Mandarin-language mentions show the lowest average sentiment (61%) of the three tracked languages, with recurring complaints about response clarity. No current agent is tagged as a Mandarin speaker in support logs.'),
    (v_rec5, v_user_id, 'Growth', 'low', 'Partner with a mid-tier TikTok creator in the food/lifestyle niche', 51, 66, 27, '3–4 weeks',
      'Organic mentions from creators with 50K–200K followers show 2.1x higher engagement-to-sentiment conversion than macro-influencer posts, at a fraction of typical campaign cost.'),
    (v_rec6, v_user_id, 'Investment', 'low', 'Allocate budget toward automated crisis-response tooling', 47, 70, 12, '1–2 months',
      'The last three crisis events took an average of 3.5 hours to detect manually before this dashboard was in place. Automating the initial response draft could reduce time-to-acknowledgement, which is the single strongest lever on crisis sentiment recovery.');

  insert into public.recommendation_actions (user_id, recommendation_id, label, done) values
    (v_user_id, v_rec1, 'Draft public response acknowledging delays', true),
    (v_user_id, v_rec1, 'Record short-form video reply from founder', false),
    (v_user_id, v_rec1, 'Pin response to top of TikTok profile', false),
    (v_user_id, v_rec2, 'Contact backup courier partner', false),
    (v_user_id, v_rec2, 'Reallocate 20% of orders to alternate provider', false),
    (v_user_id, v_rec3, 'Validate unit economics for smaller SKU', false),
    (v_user_id, v_rec3, 'Run a limited regional pilot', false),
    (v_user_id, v_rec4, 'Post internal job requisition', false),
    (v_user_id, v_rec4, 'Add Mandarin macros to help desk', true),
    (v_user_id, v_rec5, 'Shortlist 5 candidate creators', false),
    (v_user_id, v_rec5, 'Draft partnership brief', false),
    (v_user_id, v_rec6, 'Scope automation requirements with engineering', false),
    (v_user_id, v_rec6, 'Estimate implementation cost', false);

  -- Reports -------------------------------------------------------------------
  insert into public.report_templates (user_id, name, description, last_generated) values
    (v_user_id, 'Weekly Performance Report', 'Sentiment, mentions, and KPI summary for the past 7 days.', '2026-07-07'),
    (v_user_id, 'Monthly Business Report', 'Full monthly rollup across sentiment, forecasting, and crisis events.', '2026-06-30'),
    (v_user_id, 'Investor Update', 'Key metrics and growth narrative formatted for stakeholders.', '2026-06-15'),
    (v_user_id, 'Startup Health Report', 'Composite business health score with contributing factors.', '2026-07-01'),
    (v_user_id, 'Sentiment Deep-Dive', 'Detailed sentiment breakdown by platform, language, and region.', '2026-07-08'),
    (v_user_id, 'Forecast Accuracy Report', 'Forecast vs. actuals reconciliation and model accuracy audit.', '2026-06-28');

  -- Dataset Management -----------------------------------------------------
  insert into public.api_connections (user_id, name, status, last_sync) values
    (v_user_id, 'TikTok API', 'connected', now() - interval '5 minutes'),
    (v_user_id, 'X API', 'connected', now() - interval '12 minutes'),
    (v_user_id, 'Internal Database', 'connected', now() - interval '1 minute');

  insert into public.storage_usage (user_id, used_gb, total_gb, language_breakdown)
  values (
    v_user_id, 34.2, 100,
    '[{"language": "English", "code": "en", "percent": 48}, {"language": "Bahasa Melayu", "code": "ms", "percent": 36}, {"language": "Mandarin", "code": "zh", "percent": 16}]'::jsonb
  )
  on conflict (user_id) do update set used_gb = excluded.used_gb, language_breakdown = excluded.language_breakdown;

  insert into public.dataset_imports (user_id, file, size, records, quality, status) values
    (v_user_id, 'tiktok_mentions_jul.csv', 18400000, 42180, 96, 'success'),
    (v_user_id, 'x_mentions_jul.json', 9800000, 21540, 91, 'success'),
    (v_user_id, 'customer_survey_q2.xlsx', 2100000, 1240, 88, 'success'),
    (v_user_id, 'sales_transactions_jun.csv', 31500000, 68920, 74, 'warning'),
    (v_user_id, 'support_tickets_jun.json', 4300000, 3610, 99, 'success');

end $$;
