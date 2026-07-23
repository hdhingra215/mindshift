-- ============================================================================
-- MindShift — Phase 5D.5: "Digital Life" Scenario Library
-- ============================================================================
-- Full playable content for the ONE pack "digital-life" (Phase 5C): 12
-- scenarios, choices, outcomes, bias links, pack items, then publish.
-- Structure/quality mirror the Everyday Traps benchmark (20260723000003).
--
-- Scope — Digital Life only. No schema changes, no new tables, no RLS/gameplay.
--
-- Biases taught (the 3 assigned), 4 primary each; one scenario combines the
-- echo-chamber/persuasion pair on AI content (ContentStrategy §2, §3):
--   availability-heuristic (family: memory-availability)
--   confirmation-bias      (family: belief-evidence)
--   framing-effect         (family: decision-framing)
--
-- All situations are online-native (doomscrolling, viral video, feeds, ratings,
-- reviews, forums, ads, AI content) and distinct from earlier packs.
--
-- Arc: medium -> hard; the two subtlest (curating out dissent, AI-generated
-- content) are `hard`. Correct-answer POSITION varied (§6). XP: correct 20,
-- else 5. Outcome split: result_text = what happened; explanation = bias ->
-- mechanism -> counter -> transfer (§7). Correct outcomes still teach.
--
-- Reflection prompts (by scenario slug):
--   digital-doomscroll-safety : When did an hour on your feed leave the world feeling worse than it is?
--   digital-airline-video     : When did one viral video override a solid track record for you?
--   digital-headline-outrage  : When did a headline''s wording, not its facts, decide how you felt?
--   digital-crypto-fomo       : When did a feed full of winners make a risky bet feel like a sure thing?
--   digital-star-rating       : Have you chosen between options on how a rating was phrased, not what it meant?
--   digital-echo-feed         : When did your feed make a contested issue feel settled?
--   digital-review-filter     : Have you read reviews to confirm a purchase rather than to test it?
--   digital-ingredient-scare  : When did one dramatic influencer video reshape a habit against the evidence?
--   digital-doctors-percent   : When did a confident-sounding statistic persuade you before you checked it?
--   digital-reddit-hunt       : Have you kept searching forums until you found the thread that agreed?
--   digital-unfollow-dissent  : When did you curate away a voice mainly because it disagreed with you?
--   digital-ai-article        : When did something being well-written and agreeable stand in for it being true?
--
-- Idempotency: `digital-` slug prefix (unique to this pack). Re-run deletes and
-- re-inserts this pack''s children; scenarios upsert on slug. Safe pre-launch.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. scenarios — 12 rows. category_id = the PRIMARY bias''s family, by slug.
-- ----------------------------------------------------------------------------
insert into public.scenarios
  (slug, title, context, stakes, difficulty, category_id, source, status, version)
values
  (
    'digital-doomscroll-safety',
    'An Hour Before Bed',
    'An hour into scrolling before bed, your feed has served up a mugging, a scam, a house fire, and three furious news clips. The world suddenly feels dangerous and getting worse. In truth most of these are rare events pulled from across the country, chosen because they provoke. You''re deciding whether to sit with that dread — and act on it.',
    'Your sense of how safe the world is, shaped by an algorithm that sells alarm.',
    'medium',
    (select id from public.categories where slug = 'memory-availability'),
    'authored', 'published', 1
  ),
  (
    'digital-airline-video',
    'The Nightmare Flight',
    'A video of one passenger''s nightmare flight on a specific airline is everywhere — millions of views, furious comments. You''re about to book travel, and that airline is the cheapest, with a solid on-time and safety record. The clip keeps replaying in your head.',
    'A cheaper flight with a good record, against one video you can''t unsee.',
    'medium',
    (select id from public.categories where slug = 'memory-availability'),
    'authored', 'published', 1
  ),
  (
    'digital-headline-outrage',
    'Officials ADMIT',
    'A headline scrolls past: "Officials ADMIT new policy could COST families thousands." Your blood pressure spikes. The same facts, in a drier outlet, read: "Policy carries modest costs for some households and savings for others." You''re about to angrily share the first one.',
    'What you amplify to everyone who follows you, based on wording alone.',
    'medium',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'digital-crypto-fomo',
    'Still Early',
    'Your feeds are flooded with people posting huge gains on one coin — screenshots, celebrations, "still early!" It feels like everyone''s winning and you''re missing out. You don''t see the silent majority who lost, because losers rarely post. You''re tempted to put in money you can''t really spare.',
    'Money you can''t afford to lose, against a highlight reel that hides the losses.',
    'medium',
    (select id from public.categories where slug = 'memory-availability'),
    'authored', 'published', 1
  ),
  (
    'digital-star-rating',
    'Three Percent Dissatisfied',
    'Two similar products. One shows "4.6 stars." The other, an identical average, displays "only 3% of buyers were dissatisfied." That phrasing somehow makes it feel riskier, though 3% unhappy is roughly a 4.6. You find yourself leaning to the first without checking how many reviews each has.',
    'The better product, or just the better-worded rating.',
    'medium',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'digital-echo-feed',
    'Everyone Agrees',
    'After months of likes and follows, your feed shows almost only your side of a heated issue. It feels like the debate is settled and everyone sensible agrees with you. You rarely see the strongest opposing arguments — the algorithm learned to stop surfacing them. Someone shares a thoughtful counterpoint.',
    'Whether you actually understand the other side, or just think you do.',
    'medium',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  ),
  (
    'digital-review-filter',
    'Sorting to Five Stars',
    'You''ve already fallen for a gadget and you''re "checking reviews." You catch yourself sorting to the five-star ones, nodding along, and skimming the detailed one-stars as "people who misused it." Those critical reviews flag a real, recurring flaw. Your cursor hovers over Buy.',
    'A purchase you''ll live with, against the flaw you''re talking yourself past.',
    'medium',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  ),
  (
    'digital-ingredient-scare',
    'Destroying Your Health',
    'A wellness influencer posts a dramatic, tearful video about a common ingredient "destroying your health," wrapped in a vivid personal story. It sticks with you, and now you want to purge everything containing it from your kitchen. The scientific consensus considers it safe in normal amounts.',
    'A pantry overhaul and lasting worry, driven by one emotional video.',
    'medium',
    (select id from public.categories where slug = 'memory-availability'),
    'authored', 'published', 1
  ),
  (
    'digital-doctors-percent',
    'Nine Out of Ten',
    'An ad for a supplement declares "9 out of 10 doctors recommend it!" in bold. The same survey could read "1 in 10 doctors would not recommend it," or note the sample was tiny and vague. The confident framing makes it feel proven. You''re considering buying a few months'' supply.',
    'Your money and health, staked on a statistic built to reassure.',
    'medium',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'digital-reddit-hunt',
    'The Thread That Agrees',
    'Deciding on a big purchase, you search across forums. You breeze past the balanced threads and keep scrolling until you hit one enthusiastically confirming what you already wanted, then screenshot it as "the research." The cooler, critical threads sit unread in the tabs behind it.',
    'A costly decision dressed up as research you rigged to agree.',
    'medium',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  ),
  (
    'digital-unfollow-dissent',
    'One Tap to Calmer',
    'Someone you follow keeps posting takes that clash with your views, and it''s irritating. Your thumb hovers over "unfollow" — it would make the feed calmer and more agreeable. But they''re thoughtful, not a troll, and now and then they make you genuinely reconsider. One tap curates them out of your world.',
    'A more comfortable feed, at the cost of the friction that keeps you honest.',
    'hard',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  ),
  (
    'digital-ai-article',
    'Exactly What You Wanted to Be True',
    'You find a slick, well-written article that confirms a view you hold, packed with confident statistics and vivid anecdotes. It reads persuasively — and it''s AI-generated: no author, no sources, and a couple of "facts" that seem a little too clean. It''s exactly what you wanted to be true, and you''re ready to share it widely.',
    'Your credibility and others'' beliefs, riding on something polished but unverified.',
    'hard',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  )
on conflict (slug) do update set
  title       = excluded.title,
  context     = excluded.context,
  stakes      = excluded.stakes,
  difficulty  = excluded.difficulty,
  category_id = excluded.category_id,
  source      = excluded.source,
  status      = excluded.status,
  version     = excluded.version,
  updated_at  = now();

-- ----------------------------------------------------------------------------
-- 2. Idempotency — clear this pack''s child rows (outcomes cascade).
-- ----------------------------------------------------------------------------
delete from public.scenario_pack_items
  where scenario_id in (select id from public.scenarios where slug like 'digital-%');
delete from public.scenario_biases
  where scenario_id in (select id from public.scenarios where slug like 'digital-%');
delete from public.scenario_choices
  where scenario_id in (select id from public.scenarios where slug like 'digital-%');

-- ----------------------------------------------------------------------------
-- 3. scenario_choices — 3 per scenario. Trap choices carry the target bias_id.
-- ----------------------------------------------------------------------------
insert into public.scenario_choices (scenario_id, label, body, is_trap, bias_id, sort_order)
select sc.id, v.label, null, v.is_trap, b.id, v.sort_order
from (values
  -- 1 · digital-doomscroll-safety (availability) — correct @ 1
  ('digital-doomscroll-safety', 1, 'Remember the feed selects for the dramatic, not the typical, and take the dread with heavy salt.', false, null),
  ('digital-doomscroll-safety', 2, 'Trust the feeling — clearly things really are getting worse out there.', true,  'availability-heuristic'),
  ('digital-doomscroll-safety', 3, 'Keep scrolling to work out just how bad it''s gotten.', false, null),
  -- 2 · digital-airline-video (availability) — correct @ 2
  ('digital-airline-video', 1, 'Avoid that airline — with that many people upset, it must be bad.', true,  'availability-heuristic'),
  ('digital-airline-video', 2, 'Weigh the airline''s actual on-time and safety record over one viral clip, and book if it holds.', false, null),
  ('digital-airline-video', 3, 'Pay more for a different airline, just for peace of mind.', false, null),
  -- 3 · digital-headline-outrage (framing) — correct @ 3
  ('digital-headline-outrage', 1, 'Share it — people need to know what this policy will cost them.', true,  'framing-effect'),
  ('digital-headline-outrage', 2, 'Fire off an angry comment before reading any further.', false, null),
  ('digital-headline-outrage', 3, 'Notice the outrage lives in the wording, read the actual details, then decide.', false, null),
  -- 4 · digital-crypto-fomo (availability) — correct @ 1
  ('digital-crypto-fomo', 1, 'Remember only the winners post; judge the odds by data, not a feed of highlight reels.', false, null),
  ('digital-crypto-fomo', 2, 'Get in now — everyone''s clearly making money on this.', true,  'availability-heuristic'),
  ('digital-crypto-fomo', 3, 'Put in a small amount so you don''t completely miss out.', false, null),
  -- 5 · digital-star-rating (framing) — correct @ 2
  ('digital-star-rating', 1, 'Pick the "4.6 stars" one — it simply reads better.', true,  'framing-effect'),
  ('digital-star-rating', 2, 'See both describe the same satisfaction, and compare review counts and specifics instead.', false, null),
  ('digital-star-rating', 3, 'Pick the "3% dissatisfied" one because it sounds more precise.', false, null),
  -- 6 · digital-echo-feed (confirmation) — correct @ 3
  ('digital-echo-feed', 1, 'Scroll past — you''ve heard the other side, and it''s not convincing.', true,  'confirmation-bias'),
  ('digital-echo-feed', 2, 'Dunk on it in the replies for the like-minded crowd.', false, null),
  ('digital-echo-feed', 3, 'Read it properly, aware your feed has been quietly hiding the best opposing case.', false, null),
  -- 7 · digital-review-filter (confirmation) — correct @ 1
  ('digital-review-filter', 1, 'Read the critical reviews as carefully as the glowing ones before buying.', false, null),
  ('digital-review-filter', 2, 'Buy it — the reviews are overwhelmingly positive.', true,  'confirmation-bias'),
  ('digital-review-filter', 3, 'Buy it, and just plan to return it if the flaw shows up.', false, null),
  -- 8 · digital-ingredient-scare (availability) — correct @ 2
  ('digital-ingredient-scare', 1, 'Purge everything with it — that story was too alarming to ignore.', true,  'availability-heuristic'),
  ('digital-ingredient-scare', 2, 'Weigh the consensus over one vivid video, and check a reliable source before purging.', false, null),
  ('digital-ingredient-scare', 3, 'Cut back on it a bit, just in case.', false, null),
  -- 9 · digital-doctors-percent (framing) — correct @ 3
  ('digital-doctors-percent', 1, 'Buy it — if 9 in 10 doctors back it, that''s good enough for me.', true,  'framing-effect'),
  ('digital-doctors-percent', 2, 'Buy it because the brand looks professional and reassuring.', false, null),
  ('digital-doctors-percent', 3, 'Notice the stat is framed to persuade, and look for what it''s actually based on.', false, null),
  -- 10 · digital-reddit-hunt (confirmation) — correct @ 1
  ('digital-reddit-hunt', 1, 'Go back to the balanced and critical threads you skipped, and weigh them honestly.', false, null),
  ('digital-reddit-hunt', 2, 'Trust the enthusiastic thread — it confirms what the research shows.', true,  'confirmation-bias'),
  ('digital-reddit-hunt', 3, 'Keep searching for a second thread that agrees, just to be sure.', false, null),
  -- 11 · digital-unfollow-dissent (confirmation) — correct @ 2
  ('digital-unfollow-dissent', 1, 'Unfollow — your feed should be a place you enjoy, not argue.', true,  'confirmation-bias'),
  ('digital-unfollow-dissent', 2, 'Keep following; a thoughtful voice you disagree with is exactly what keeps you honest.', false, null),
  ('digital-unfollow-dissent', 3, 'Mute them for now and revisit when you''re less annoyed.', false, null),
  -- 12 · digital-ai-article (confirmation + framing) — correct @ 3
  ('digital-ai-article', 1, 'Share it — it says what you''ve been saying, and says it well.', true,  'confirmation-bias'),
  ('digital-ai-article', 2, 'Save it as ammo for your next argument, sources or not.', false, null),
  ('digital-ai-article', 3, 'Pause — its polish and agreeableness are the pull; verify the claims before trusting or sharing.', false, null)
) as v(scenario_slug, sort_order, label, is_trap, bias_slug)
join public.scenarios sc on sc.slug = v.scenario_slug
left join public.biases b on b.slug = v.bias_slug;

-- ----------------------------------------------------------------------------
-- 4. outcomes — one per choice. Joined by (scenario_slug, sort_order).
-- ----------------------------------------------------------------------------
insert into public.outcomes (choice_id, result_text, explanation, is_correct, xp_reward)
select c.id, v.result_text, v.explanation, v.is_correct, v.xp_reward
from (values
  -- 1 · digital-doomscroll-safety
  ('digital-doomscroll-safety', 1,
    'You put the phone down, noting the feed is a highlight reel of the worst, not a map of the world.',
    'Well done. The dread was the availability heuristic — vivid, hand-picked disasters coming to mind so easily that they feel common and close, when they''re rare events scraped from everywhere to provoke a reaction. Ease of recall isn''t frequency. Judge real risk by base rates, not by how much a feed can make you picture; the algorithm optimises for alarm, not accuracy.',
    true, 20),
  ('digital-doomscroll-safety', 2,
    'You carry the dread into the next day, treating a curated stream of worst-cases as the state of the world.',
    'That''s the availability heuristic, weaponised by a feed. The clips come to mind instantly, so danger feels widespread and rising — but they were selected precisely because they''re dramatic, not because they''re typical. Ease of recall isn''t evidence of frequency. Check base rates before acting on feed-fuelled fear; most of what trends is rare by definition, which is why it''s newsworthy.',
    false, 5),
  ('digital-doomscroll-safety', 3,
    'You keep scrolling "to gauge how bad it is," and every fresh clip cements the fear.',
    'Scrolling for more is the availability heuristic feeding itself — each additional vivid example makes danger feel more common, when you''re really just sampling more of what the algorithm selects to alarm. More dramatic inputs won''t calibrate your sense of risk; they''ll distort it further. Step back and consult actual base rates instead of letting an infinite feed of worst-cases set your view of the world.',
    false, 5),
  -- 2 · digital-airline-video
  ('digital-airline-video', 1,
    'You skip the cheap flight; one viral clip just outvoted the airline''s entire record.',
    'That''s the availability heuristic. One emotionally charged video, seen a million times, comes to mind so vividly it outweighs a solid safety and on-time record — because "millions of views" feels like evidence when it''s really just reach. A single dramatic case isn''t a base rate. Judge the airline by its actual data; virality measures how shareable a story is, not how representative.',
    false, 5),
  ('digital-airline-video', 2,
    'You book the cheaper flight on its record, and it goes exactly as uneventfully as the numbers predicted.',
    'Well judged. The looping clip was the availability heuristic — a vivid, oft-viewed story masquerading as the norm. You weighed the airline''s real track record over one incident, which is the counter: base rates beat anecdotes, however viral. A story going viral tells you it''s dramatic and shareable, not that it''s likely to happen to you. Let data, not view counts, decide.',
    true, 20),
  ('digital-airline-video', 3,
    'You pay a premium for "peace of mind," buying reassurance against a risk the data says is tiny.',
    'Paying extra here is the availability heuristic setting the price. The vivid clip made the cheaper airline feel dangerous despite its solid record, so the premium buys relief from a fear the numbers don''t support. Peace of mind is worth something, but not when it''s manufactured by one viral video. Check the actual safety and reliability data; let it, not the clip, tell you whether the extra cost is real.',
    false, 5),
  -- 3 · digital-headline-outrage
  ('digital-headline-outrage', 1,
    'You share the furious version; your followers inherit the outrage, and the calmer truth never travels with it.',
    'That''s the framing effect. "ADMIT" and "COST families thousands" package neutral facts as a scandal, and you reacted to the packaging, not the substance — the same policy read as balanced elsewhere. Emotionally charged framing spreads because it feels urgent. Before amplifying, restate the claim plainly and check the actual details; if it only lands in the outraged wording, the wording is the story.',
    false, 5),
  ('digital-headline-outrage', 2,
    'You fire off an angry comment on the headline alone, defending a reaction the article never earned.',
    'Commenting on the framing before reading is the framing effect at full speed. The loaded headline manufactured the anger; you supplied the audience. Charged wording is engineered to trigger a reaction that bypasses the facts. The fix is boring but powerful: read past the headline, restate the claim neutrally, and see whether anything is actually there before you spend your outrage or your credibility.',
    false, 5),
  ('digital-headline-outrage', 3,
    'You read the details, find the reality is mixed and modest, and skip the share — or share the honest version.',
    'Exactly right. You spotted that the outrage lived in the framing — "ADMIT," "COST thousands" — not the facts, which read as ordinary trade-offs elsewhere. That''s the counter to the framing effect: strip the emotional wording and judge the substance. Headlines are optimised to make you feel before you think; reading the actual content first is how you avoid amplifying spin.',
    true, 20),
  -- 4 · digital-crypto-fomo
  ('digital-crypto-fomo', 1,
    'You sit out the hype, aware the feed shows the winners and hides everyone who quietly lost.',
    'Well done. The sense that "everyone''s winning" is the availability heuristic plus survivorship: winners post screenshots, losers go silent, so your feed is a highlight reel that makes gains feel common and easy. Ease of recall isn''t the odds. Judge a risky bet by its actual base rate of outcomes, not by a stream of celebrations selected — by human nature — to omit the losses.',
    true, 20),
  ('digital-crypto-fomo', 2,
    'You put in money you can''t spare because "everyone''s making money," and meet the losses the feed never showed.',
    'That''s the availability heuristic riding survivorship bias. The visible winners come to mind instantly and feel representative, while the silent majority of losers leaves no trace in your feed — so easy, joyful examples make a gamble look like a trend. What''s easy to recall isn''t what''s likely. Weigh the real distribution of outcomes, not a curated reel of the lucky, before risking money that matters.',
    false, 5),
  ('digital-crypto-fomo', 3,
    'You put in a "small amount so you don''t miss out," letting FOMO make the decision at a discount.',
    'A small stake still lets the availability heuristic decide — the feed of winners created the fear of missing out, and you acted on it rather than on the odds. Sizing down manages the damage but not the reasoning: you''re still buying because celebrations are vivid and losses are invisible. Decide from the actual risk and your own plan, not from a highlight reel; "at least I''m in" isn''t an analysis.',
    false, 5),
  -- 5 · digital-star-rating
  ('digital-star-rating', 1,
    'You pick the "4.6 stars" product on feel, having judged two identical scores by their wording.',
    'That''s the framing effect. "4.6 stars" and "3% dissatisfied" describe the same satisfaction, but the positive frame reads as reassurance and the negative frame as risk — so wording, not quality, chose for you. Worse, you skipped the counts that actually matter. Restate ratings in a common form and compare the real signals: how many reviews, and what the detailed ones say.',
    false, 5),
  ('digital-star-rating', 2,
    'You realise both ratings say the same thing and choose on review counts and specifics instead.',
    'Exactly right. You saw through the framing effect — "4.6 stars" and "only 3% dissatisfied" are the same fact dressed as a gain and a loss — and went to what genuinely differentiates products: the number of reviews and what buyers actually report. Ratings are presented to persuade. Converting them to a common frame, then reading the substance, is how you compare quality rather than phrasing.',
    true, 20),
  ('digital-star-rating', 3,
    'You pick the "3% dissatisfied" one because it "sounds precise," swapping one framing pull for another.',
    'Choosing on "sounds precise" is still the framing effect — you''ve been swayed by the flavour of the wording rather than the identical satisfaction both express, and again skipped the counts. Precise-sounding phrasing isn''t better data; 3% of a dozen reviews and 3% of ten thousand are worlds apart. Normalise the two ratings, then decide on review volume and the specifics inside them.',
    false, 5),
  -- 6 · digital-echo-feed
  ('digital-echo-feed', 1,
    'You scroll past, certain you know the other side — a side your feed stopped showing you months ago.',
    'That''s confirmation bias, amplified by an algorithm. Your likes trained the feed to serve agreement and bury the strongest opposing arguments, so "I''ve heard it and it''s weak" is really "I''ve only seen strawmen of it." Feeling well-informed while seeing one side is the trap. Seek out the best version of the opposing case; if your view is sound, it survives the strong form, not just the weak.',
    false, 5),
  ('digital-echo-feed', 2,
    'You pile on for the home crowd; the likes roll in, and your understanding of the issue doesn''t move an inch.',
    'Dunking for the like-minded is confirmation bias turned into performance. The applause confirms what you and your audience already believe and teaches you nothing about the counterpoint you skipped. An algorithmic feed already hides the strongest opposing arguments; mocking a lone one buries them further. Engage the best version of the other side honestly — the goal is to be right, not to be cheered.',
    false, 5),
  ('digital-echo-feed', 3,
    'You read the counterpoint properly; it sharpens your view in places and softens it in others.',
    'Exactly right. You recognised that your feed had manufactured a false consensus — confirmation bias with an algorithmic engine, quietly filtering out the strongest opposing case. Reading a thoughtful counterpoint on its merits is the antidote: it either strengthens your position by testing it or corrects it where it''s weak. Deliberately seek disconfirming views, especially when everything around you seems to agree.',
    true, 20),
  -- 7 · digital-review-filter
  ('digital-review-filter', 1,
    'You read the one-stars properly, take the recurring flaw seriously, and make a clear-eyed call.',
    'Well done. "Checking reviews" while sorting to five stars and dismissing the critics is confirmation bias — gathering support for a decision you''d already made and explaining away anything that threatens it. Genuine research weights the critical reviews at least as heavily, because they name the failure modes. You tested the purchase instead of rationalising it; do that whenever you''ve already fallen for something.',
    true, 20),
  ('digital-review-filter', 2,
    'You buy on the "overwhelmingly positive" reviews you curated, and the flagged flaw shows up as promised.',
    'That''s confirmation bias. Once you''d fallen for the gadget, "checking reviews" became a hunt for permission — five stars affirmed, one-stars got waved off as user error, and the recurring flaw they named went unweighed. A search that only collects agreement isn''t research. Read the critical reviews as carefully as the glowing ones; they''re where the real, disconfirming information usually lives.',
    false, 5),
  ('digital-review-filter', 3,
    'You buy with a "return it if needed" hedge, quietly betting the critics you skimmed are wrong.',
    'The return plan is confirmation bias with an escape hatch — it lets you proceed on the five-star reviews while postponing the disconfirming ones the critics already provided for free. You''re likely to eat the hassle of a return you could have avoided by reading now. Weigh the detailed one-stars before buying, not after; the information you need is already there, if you''ll let it count.',
    false, 5),
  -- 8 · digital-ingredient-scare
  ('digital-ingredient-scare', 1,
    'You purge the pantry on the strength of one tearful video, over a broad scientific consensus.',
    'That''s the availability heuristic. A vivid, emotional story sticks in memory and feels like strong evidence, so one influencer''s video outweighs the dull, boring consensus of actual research. Emotional salience isn''t proof. Before overhauling a habit, check what reliable sources and the weight of evidence say; a moving personal anecdote is designed to be memorable, which is exactly why it misleads.',
    false, 5),
  ('digital-ingredient-scare', 2,
    'You check a reliable source, find the consensus reassuring, and keep your kitchen and your calm.',
    'Exactly right. The sticky, tearful video was the availability heuristic — vivid emotion posing as evidence — and you countered it by weighing the scientific consensus over one dramatic clip. A single memorable story shouldn''t outrank the boring aggregate of research. When something alarming goes viral, pause and consult reliable sources; the feeling of "this could be me" is not the same as "this is likely true."',
    true, 20),
  ('digital-ingredient-scare', 3,
    'You "cut back a bit, just in case," letting the video quietly win a smaller version of the argument.',
    'The compromise still hands the decision to the availability heuristic — the vivid video shifted your behaviour despite a consensus that the ingredient is safe in normal amounts. "Just in case" feels prudent but is really the emotional clip setting policy at a discount. Let the evidence, not the anecdote, decide whether any change is warranted; a moving story isn''t a reason to override the science, even partly.',
    false, 5),
  -- 9 · digital-doctors-percent
  ('digital-doctors-percent', 1,
    'You buy on "9 out of 10 doctors," trusting a stat engineered to sound like proof.',
    'That''s the framing effect. "9 out of 10 recommend" is the same data as "1 in 10 would not," dressed as overwhelming endorsement — and the frame hides the questions that matter: how many doctors, chosen how, asked what. Confident phrasing isn''t evidence. Restate the claim in its plain or negative form and look for the methodology; marketing statistics are framed to persuade, not to inform.',
    false, 5),
  ('digital-doctors-percent', 2,
    'You buy because the brand "looks professional," mistaking polish for proof.',
    'Slick presentation is framing too — professional design and a confident "9 out of 10" are built to feel trustworthy regardless of what''s underneath. You judged the wrapper, not the evidence, and never asked what the statistic was based on. Appearance and phrasing are the cheapest things to fake. Look past the production values to the actual basis of the claim before spending money on your health.',
    false, 5),
  ('digital-doctors-percent', 3,
    'You question the framing, dig for the methodology, and find the stat is far flimsier than it sounded.',
    'Exactly right. You saw "9 out of 10 doctors" for what it is — a framing effect, the same thin survey packaged as proof — and asked the decisive question: based on what? Marketing stats are phrased to reassure, so the counter is to restate them plainly and hunt for the method behind them. A confident number with no visible basis is a slogan, not evidence.',
    true, 20),
  -- 10 · digital-reddit-hunt
  ('digital-reddit-hunt', 1,
    'You go back to the critical threads, weigh them honestly, and decide with the full picture.',
    'Well done. Scrolling past balanced threads until one cheered your existing preference is confirmation bias wearing the costume of research — you were collecting a verdict, not testing one. Real diligence gives the critical, balanced sources equal weight, because that''s where the risks surface. Screenshotting the agreeable thread proves only that you found it. Seek the strongest doubts before a big decision, not the loudest yes.',
    true, 20),
  ('digital-reddit-hunt', 2,
    'You trust the enthusiastic thread as "the research," and inherit the downsides the critics had already named.',
    'That''s confirmation bias. You kept searching until a thread confirmed what you wanted, then treated finding it as proof — while the balanced and critical threads, the ones that could have changed your mind, sat unread. A search designed to reach a conclusion isn''t research. Weight the doubts as heavily as the endorsements; the point of looking is to be corrected if you''re wrong, not just reassured.',
    false, 5),
  ('digital-reddit-hunt', 3,
    'You hunt for a second agreeing thread "to be sure," mistaking more agreement for more evidence.',
    'Collecting a second yes is confirmation bias compounding — two hand-picked endorsements aren''t stronger than one, they''re the same bias twice. "To be sure" would mean seeking the best case against the purchase, not another voice for it. The critical threads you skipped are the ones that could actually inform the decision. Go read what might change your mind, rather than stacking up what won''t.',
    false, 5),
  -- 11 · digital-unfollow-dissent
  ('digital-unfollow-dissent', 1,
    'You unfollow; the feed gets calmer and more agreeable, and a notch harder to think against.',
    'That''s confirmation bias, one tap at a time. Curating out a thoughtful dissenter makes the timeline pleasant precisely by removing what challenges you — and a feed you always agree with slowly narrows what you''re able to consider. Comfort isn''t the same as truth. Keep the reasonable voices that push back; the mild irritation of disagreement is the cost of not sealing yourself into an echo chamber.',
    false, 5),
  ('digital-unfollow-dissent', 2,
    'You keep following; the occasional friction is annoying and, now and then, genuinely sharpens your thinking.',
    'Well done. Unfollowing a thoughtful voice purely for disagreeing is confirmation bias curating your inputs — building a feed that only ever confirms you. You chose the productive discomfort instead, which is what keeps a mind honest. Reserve unfollows for trolls and bad faith, not for people who make you reconsider; a reasonable challenger is an asset, even when your thumb wants the calmer feed.',
    true, 20),
  ('digital-unfollow-dissent', 3,
    'You mute them "for now," a softer curation that still quiets the disagreement when it''s most useful.',
    'Muting is confirmation bias in a gentler form — it removes the challenge exactly when it stings, which tends to be when it''s working. "Revisit later" rarely comes, and the feed drifts toward pure agreement anyway. If they''re thoughtful rather than toxic, the friction is the point. Sit with the annoyance rather than silencing it; a voice that makes you reconsider is doing you a favour, not a harm.',
    false, 5),
  -- 12 · digital-ai-article
  ('digital-ai-article', 1,
    'You share it because it''s well-written and agrees with you; later, the too-clean "facts" don''t hold up.',
    'Two biases in tandem. It confirms what you already believe — confirmation bias — and its slick, confident prose is a framing effect: polish reads as credibility. Together they make an unsourced, AI-generated piece feel true because it''s agreeable and well-packaged. Neither agreement nor eloquence is evidence. Verify the specific claims against real sources before trusting or amplifying, especially when something is exactly what you hoped was true.',
    false, 5),
  ('digital-ai-article', 2,
    'You stockpile it as "ammo," ready to spread unsourced claims the moment an argument starts.',
    'Saving it as ammunition locks in both traps: confirmation bias (it backs your side) and the framing effect (its confident polish stands in for proof), on a piece with no author and no sources. Arming yourself with unverified claims risks your credibility the moment someone checks. Before a claim earns a place in your arsenal, confirm it holds up independently; agreeable and well-written is not the same as accurate.',
    false, 5),
  ('digital-ai-article', 3,
    'You pause, notice why it feels so convincing, and verify before trusting or sharing a word.',
    'Exactly right. You caught the machinery: confirmation bias (it''s what you wanted to be true) and the framing effect (its polish feels like authority), on unsourced AI-generated content. Recognising that agreement and eloquence are doing the persuading is what lets you step back. Check the specific claims against real sources first — in an age of fluent, sourceless content, verification matters most precisely when a piece feels most convincing.',
    true, 20)
) as v(scenario_slug, sort_order, result_text, explanation, is_correct, xp_reward)
join public.scenarios sc on sc.slug = v.scenario_slug
join public.scenario_choices c on c.scenario_id = sc.id and c.sort_order = v.sort_order;

-- ----------------------------------------------------------------------------
-- 5. scenario_biases — primary per scenario; the AI-content scenario combines two.
-- ----------------------------------------------------------------------------
insert into public.scenario_biases (scenario_id, bias_id)
select sc.id, b.id
from (values
  ('digital-doomscroll-safety', 'availability-heuristic'),
  ('digital-airline-video',     'availability-heuristic'),
  ('digital-headline-outrage',  'framing-effect'),
  ('digital-crypto-fomo',       'availability-heuristic'),
  ('digital-star-rating',       'framing-effect'),
  ('digital-echo-feed',         'confirmation-bias'),
  ('digital-review-filter',     'confirmation-bias'),
  ('digital-ingredient-scare',  'availability-heuristic'),
  ('digital-doctors-percent',   'framing-effect'),
  ('digital-reddit-hunt',       'confirmation-bias'),
  ('digital-unfollow-dissent',  'confirmation-bias'),
  ('digital-ai-article',        'confirmation-bias'),
  ('digital-ai-article',        'framing-effect')
) as v(scenario_slug, bias_slug)
join public.scenarios sc on sc.slug = v.scenario_slug
join public.biases b on b.slug = v.bias_slug;

-- ----------------------------------------------------------------------------
-- 6. scenario_pack_items — order within Digital Life (medium -> hard).
-- ----------------------------------------------------------------------------
insert into public.scenario_pack_items (pack_id, scenario_id, sort_order)
select p.id, sc.id, v.sort_order
from (values
  ('digital-doomscroll-safety', 1),
  ('digital-airline-video',     2),
  ('digital-headline-outrage',  3),
  ('digital-crypto-fomo',       4),
  ('digital-star-rating',       5),
  ('digital-echo-feed',         6),
  ('digital-review-filter',     7),
  ('digital-ingredient-scare',  8),
  ('digital-doctors-percent',   9),
  ('digital-reddit-hunt',       10),
  ('digital-unfollow-dissent',  11),
  ('digital-ai-article',        12)
) as v(scenario_slug, sort_order)
cross join (select id from public.scenario_packs where slug = 'digital-life') p
join public.scenarios sc on sc.slug = v.scenario_slug;

-- ----------------------------------------------------------------------------
-- 7. Publish the pack.
-- ----------------------------------------------------------------------------
update public.scenario_packs
  set is_published = true, updated_at = now()
  where slug = 'digital-life';
