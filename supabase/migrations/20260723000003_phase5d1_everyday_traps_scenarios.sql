-- ============================================================================
-- MindShift — Phase 5D.1: "Everyday Traps" Scenario Library
-- ============================================================================
-- Seeds the full playable content for the ONE pack "everyday-traps" (Phase 5C):
-- 12 authored scenarios, their choices, outcomes, bias links, and pack items —
-- then publishes the pack now that it has content.
--
-- Source of truth: docs/product/ContentStrategy.md (§2 learning arc, §4
-- difficulty, §5 scenario design, §6 choices, §7 five-part outcome),
-- docs/content/BiasCatalog.md, Categories.md, and the Phase 5C coverage map.
--
-- Scope — Everyday Traps only. No other pack is touched. No schema changes, no
-- new tables, no RLS changes, no gameplay/edge code.
--
-- Biases taught (the 3 beginner biases assigned to this pack), 4 scenarios each:
--   availability-heuristic (family: memory-availability)
--   framing-effect         (family: decision-framing)
--   anchoring              (family: value-anchoring)
-- Every scenario isolates ONE primary bias (ContentStrategy §2: early content
-- builds vocabulary one bias at a time). All are `easy` — this is the on-ramp.
--
-- Progression (pack sort_order 1..12): a gentle availability -> framing ->
-- anchoring rotation with rising subtlety, from a blatant trap (a week of crash
-- footage) to disguised ones (a negotiation anchor, a "save 20%" frame).
--
-- Correct-answer POSITION is deliberately varied across scenarios (§6: no
-- positional pattern; correctness never depends on order).
--
-- Outcome split (matches the two schema columns):
--   result_text = Part 1, "what happened" — the concrete consequence.
--   explanation = Parts 2-5 — bias named -> mechanism -> counter-strategy ->
--                 transfer to real life. Correct-choice outcomes still teach.
--
-- Reflection prompts: authored per scenario and recorded in the block below.
-- The schema has no authored reflection-prompt column (reflections.prompt is
-- player-owned, per-attempt), and the schema is frozen this phase, so the
-- gameplay layer will supply these prompts into reflections.prompt at play time.
--
-- Reflection prompts (by scenario slug):
--   everyday-flight-risk        : When has a dramatic news story recently made a rare risk feel more likely than it is?
--   everyday-yogurt-label       : Where have you seen the same fact worded two ways to feel different — a menu, an ad, a label?
--   everyday-jacket-sale        : Think of a recent buy — did a "was/now" price make it feel like a deal? What was it actually worth to you?
--   everyday-neighborhood-alarm : When did a single vivid story from someone you know push a decision? Did the numbers back it up?
--   everyday-phone-plan         : Think of two products described differently — did the wording, not the facts, tip your choice?
--   everyday-wine-list          : Have you ever spent more because a pricier option nearby made your pick "feel reasonable"?
--   everyday-car-brand          : When has one loud review or video made you doubt something the data supported?
--   everyday-card-surcharge     : When has a "surcharge" bothered you more than the same amount as a lost discount?
--   everyday-tip-screen         : Have preset amounts — tips, donations, sizes — ever nudged you higher than you intended?
--   everyday-medication-worry   : When has a single alarming story online made a rare risk feel likely to happen to you?
--   everyday-gym-annual         : Has a "save X%" offer ever led you to buy more, or commit longer, than you needed?
--   everyday-marketplace-price  : In a negotiation, have you measured your offer against their number instead of the real value?
--
-- Idempotency: all Everyday Traps scenarios use the `everyday-` slug prefix
-- (no other pack uses it). Re-running deletes this pack's child rows and
-- re-inserts them; scenarios upsert on slug so their UUIDs stay stable. This is
-- safe pre-launch (no attempts reference these choices yet); post-launch,
-- content edits should be versioned updates, not a seed re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. scenarios — 12 rows. category_id resolved by family slug; never hardcoded.
-- ----------------------------------------------------------------------------
insert into public.scenarios
  (slug, title, context, stakes, difficulty, category_id, source, status, version)
values
  (
    'everyday-flight-risk',
    'The Week of the Crash',
    'A plane crash has led the news all week — the same footage on every channel, every feed. You''re planning a summer trip 600 miles away, and now the flight makes you uneasy. Driving is ten hours each way, flying just ninety minutes. The fare and your schedule both work fine either way. Your partner leaves the call to you.',
    'A safe trip — and whether a week of headlines gets to decide how you travel.',
    'easy',
    (select id from public.categories where slug = 'memory-availability'),
    'authored', 'published', 1
  ),
  (
    'everyday-yogurt-label',
    'Ninety Percent Fat-Free',
    'At the store, two tubs of the same style of yogurt sit side by side, same brand tier, same price. One label announces "90% fat-free" in big friendly letters. The other simply states "contains 10% fat." You''ve been trying to eat a little healthier lately. You pick up one, then the other, comparing.',
    'A healthier choice — or just the more comforting wording.',
    'easy',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'everyday-jacket-sale',
    'Eighty-One Dollars Off',
    'Browsing a shop, you spot a jacket you like. The tag reads "$180", crossed out, with "$99" beneath it. You hadn''t planned to buy a jacket today, and $99 is more than you''d usually spend on one. The assistant mentions the sale ends tonight. It''s well-made — though you already have two similar jackets at home.',
    '$99 you weren''t going to spend, against a discount that feels too good to skip.',
    'easy',
    (select id from public.categories where slug = 'value-anchoring'),
    'authored', 'published', 1
  ),
  (
    'everyday-neighborhood-alarm',
    'Three Streets Over',
    'A neighbor tells you, in vivid detail, about a break-in three streets over — the smashed window, the ransacked rooms. It''s all you can think about that evening. A security firm''s flyer happens to be on your counter: a $600 alarm system plus $30 a month. Your area''s crime stats are low, and you''ve lived here safely for years.',
    '$600 plus a monthly bill, set against one story you can''t stop picturing.',
    'easy',
    (select id from public.categories where slug = 'memory-availability'),
    'authored', 'published', 1
  ),
  (
    'everyday-phone-plan',
    'Ninety-Nine Percent Reliable',
    'You''re choosing between two phone plans — same price, same data. One advertises "99% network reliability." The other states "1 in 100 calls may drop." They describe the same performance, but the second one makes you uneasy. A friend asks which way you''re leaning.',
    'The same coverage, described two ways — and which description you trust.',
    'easy',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'everyday-wine-list',
    'The Wine List',
    'Out for dinner, you open the wine list. At the very top sits a bottle for $220. Below it, others at $90, $65, and $40. You''d normally spend around $40. But after that $220, the $90 bottle suddenly reads as reasonable — not the cheap one, not extravagant, a respectable middle.',
    'Roughly fifty extra dollars, and whether the top of the list quietly moved you.',
    'easy',
    (select id from public.categories where slug = 'value-anchoring'),
    'authored', 'published', 1
  ),
  (
    'everyday-car-brand',
    'The Viral Breakdown',
    'You''re close to buying a reliable, well-reviewed used car. Last night a video crossed your feed: someone furious about their engine dying on that exact brand — thousands of views, thousands of angry comments. Now you''re hesitant. The model you''re looking at holds strong reliability ratings across years of data.',
    'A sound car you were ready to buy, against one video you can''t unsee.',
    'easy',
    (select id from public.categories where slug = 'memory-availability'),
    'authored', 'published', 1
  ),
  (
    'everyday-card-surcharge',
    'Surcharge or Discount',
    'A small café posts: "Card payments carry a 2% surcharge." Across the street, a near-identical café posts: "Pay cash, get a 2% discount." The final price works out the same at either. You have both cash and card on you, and you slightly prefer paying by card.',
    'The same coffee for the same money — and which sign feels fairer.',
    'easy',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'everyday-tip-screen',
    'The Tip Screen',
    'You grab a $6 coffee. The card reader spins toward you: three large buttons — 25%, 30%, 35% — with a small "custom" link tucked in the corner. A short line is forming behind you. You usually tip for table service and hadn''t planned to leave much for a quick counter coffee.',
    'A dollar or two, and whether three buttons get to set what "normal" means.',
    'easy',
    (select id from public.categories where slug = 'value-anchoring'),
    'authored', 'published', 1
  ),
  (
    'everyday-medication-worry',
    'The Rare Reaction',
    'Your doctor recommends a common medication and mentions the usual mild side effects. That night you find a forum post: someone describing a rare, frightening reaction in gripping detail. It lodges in your head. The medication is widely prescribed, and the serious reaction is genuinely rare.',
    'Following sound medical advice, against one vivid story that won''t let go.',
    'easy',
    (select id from public.categories where slug = 'memory-availability'),
    'authored', 'published', 1
  ),
  (
    'everyday-gym-annual',
    'Save Twenty Percent',
    'A gym offers two ways to pay for the same membership. "Pay monthly: $40/month." Or "Pay yearly: $384 — save 20%!" The yearly works out to $32 a month. You''re fairly sure you''ll go regularly — but you''ve signed up before and drifted off after a few months.',
    '$384 up front against a saving that hides the real question: will you keep going?',
    'easy',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'everyday-marketplace-price',
    'Four Hundred for the Bike',
    'You''re buying a used bike on a marketplace app. The seller lists it at $400. Comparable bikes in the same condition go for around $250. The seller is friendly but firm: "$400 is a steal for this model." There''s room to negotiate — but that $400 keeps framing the whole conversation in your head.',
    'Up to $150, and whether their asking price or the real value sets your offer.',
    'easy',
    (select id from public.categories where slug = 'value-anchoring'),
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
-- 2. Idempotency — clear this pack's child rows before re-inserting.
--    Outcomes cascade from scenario_choices. Scoped to the `everyday-` prefix.
-- ----------------------------------------------------------------------------
delete from public.scenario_pack_items
  where scenario_id in (select id from public.scenarios where slug like 'everyday-%');
delete from public.scenario_biases
  where scenario_id in (select id from public.scenarios where slug like 'everyday-%');
delete from public.scenario_choices
  where scenario_id in (select id from public.scenarios where slug like 'everyday-%');

-- ----------------------------------------------------------------------------
-- 3. scenario_choices — 3 per scenario. Trap choices carry the target bias_id;
--    the correct choice and neutral distractors carry none. Correct-answer
--    sort_order is varied per scenario (no positional pattern).
--    (scenario_id, sort_order) uniquely identifies a choice within a scenario;
--    outcomes (step 4) join back on that pair.
-- ----------------------------------------------------------------------------
insert into public.scenario_choices (scenario_id, label, body, is_trap, bias_id, sort_order)
select sc.id, v.label, null, v.is_trap, b.id, v.sort_order
from (values
  -- 1 · everyday-flight-risk (availability) — correct @ 2
  ('everyday-flight-risk', 1, 'Drive. After all that coverage, getting on a plane just isn''t worth the risk this year.', true,  'availability-heuristic'),
  ('everyday-flight-risk', 2, 'Fly. The footage is vivid, but mile for mile flying is far safer than a long drive.',        false, null),
  ('everyday-flight-risk', 3, 'Drive — not out of fear, but because you''d genuinely enjoy the road trip and the stops.',      false, null),
  -- 2 · everyday-yogurt-label (framing) — correct @ 1
  ('everyday-yogurt-label', 1, 'Notice they''re identical — 90% fat-free and 10% fat are the same — and pick on taste or price.', false, null),
  ('everyday-yogurt-label', 2, 'Take the "90% fat-free" tub — it''s clearly the healthier option.',                              true,  'framing-effect'),
  ('everyday-yogurt-label', 3, 'Put both back and hunt down a third option to read its full nutrition panel.',                 false, null),
  -- 3 · everyday-jacket-sale (anchoring) — correct @ 3
  ('everyday-jacket-sale', 1, 'Buy it — you could use a new jacket and this one''s your style.',                       false, null),
  ('everyday-jacket-sale', 2, 'Buy it — $81 off the original $180 is too good a deal to pass up.',                    true,  'anchoring'),
  ('everyday-jacket-sale', 3, 'Leave it — $99 is more than a jacket is worth to you right now, whatever the old tag said.', false, null),
  -- 4 · everyday-neighborhood-alarm (availability) — correct @ 2
  ('everyday-neighborhood-alarm', 1, 'Sign up tonight — after hearing that, you won''t feel safe without it.',                 true,  'availability-heuristic'),
  ('everyday-neighborhood-alarm', 2, 'Sleep on it, and check whether break-ins here are actually common before spending $600.', false, null),
  ('everyday-neighborhood-alarm', 3, 'Get the cheaper doorbell camera you''d been meaning to buy anyway.',                     false, null),
  -- 5 · everyday-phone-plan (framing) — correct @ 1
  ('everyday-phone-plan', 1, 'See that both describe the same 1% — and decide on coverage in your area or customer service.', false, null),
  ('everyday-phone-plan', 2, 'Choose the "99% reliable" plan — it sounds more dependable.',                                   true,  'framing-effect'),
  ('everyday-phone-plan', 3, 'Choose the "1 in 100" plan — at least it''s being upfront about failures.',                     false, null),
  -- 6 · everyday-wine-list (anchoring) — correct @ 3
  ('everyday-wine-list', 1, 'Order the $90 — a sensible middle-of-the-list choice.',                        true,  'anchoring'),
  ('everyday-wine-list', 2, 'Ask the server which bottle best suits your meal, whatever the price.',        false, null),
  ('everyday-wine-list', 3, 'Order around your usual $40 — the $220 at the top didn''t change what you want.', false, null),
  -- 7 · everyday-car-brand (availability) — correct @ 2
  ('everyday-car-brand', 1, 'Walk away — that many angry people can''t all be wrong about this brand.',        true,  'availability-heuristic'),
  ('everyday-car-brand', 2, 'Weigh the years of reliability data over one loud video, and keep considering it.', false, null),
  ('everyday-car-brand', 3, 'Have this specific car inspected by a mechanic before you decide.',               false, null),
  -- 8 · everyday-card-surcharge (framing) — correct @ 1
  ('everyday-card-surcharge', 1, 'Notice both charge the same, and pick the café on coffee quality or which is closer.', false, null),
  ('everyday-card-surcharge', 2, 'Cross to the second café — that "surcharge" feels like being penalized.',             true,  'framing-effect'),
  ('everyday-card-surcharge', 3, 'Stay at the first café, but pay cash to dodge the surcharge.',                         false, null),
  -- 9 · everyday-tip-screen (anchoring) — correct @ 1; two anchored buttons are both traps
  ('everyday-tip-screen', 1, 'Tap "custom" and enter what you actually think fits a counter coffee.', false, null),
  ('everyday-tip-screen', 2, 'Tap 25% — it''s the lowest button showing.',                              true,  'anchoring'),
  ('everyday-tip-screen', 3, 'Tap 30% — a safe middle choice.',                                        true,  'anchoring'),
  -- 10 · everyday-medication-worry (availability) — correct @ 2
  ('everyday-medication-worry', 1, 'Don''t fill the prescription — that reaction sounds terrifying.',                          true,  'availability-heuristic'),
  ('everyday-medication-worry', 2, 'Take your specific worry to your doctor and ask how rare the reaction actually is.',       false, null),
  ('everyday-medication-worry', 3, 'Fill it, but read every review you can find online first.',                               false, null),
  -- 11 · everyday-gym-annual (framing) — correct @ 1
  ('everyday-gym-annual', 1, 'Weigh your real chance of drifting off — monthly costs more, but you''re not locked into $384.', false, null),
  ('everyday-gym-annual', 2, 'Take the yearly plan — a 20% saving is too good to leave on the table.',                        true,  'framing-effect'),
  ('everyday-gym-annual', 3, 'Take yearly and use the money spent as motivation to keep showing up.',                         false, null),
  -- 12 · everyday-marketplace-price (anchoring) — correct @ 3
  ('everyday-marketplace-price', 1, 'Walk away — haggling isn''t worth the hassle.',                            false, null),
  ('everyday-marketplace-price', 2, 'Offer $360 — a fair bit below their asking price.',                       true,  'anchoring'),
  ('everyday-marketplace-price', 3, 'Anchor to the ~$250 the bike is actually worth, and open your offer there.', false, null)
) as v(scenario_slug, sort_order, label, is_trap, bias_slug)
join public.scenarios sc on sc.slug = v.scenario_slug
left join public.biases b on b.slug = v.bias_slug;

-- ----------------------------------------------------------------------------
-- 4. outcomes — one per choice (1:1). result_text = "what happened";
--    explanation = bias -> mechanism -> counter -> transfer. Correct outcomes
--    (is_correct = true) still teach. XP: correct 20, otherwise 5 (a miss is a
--    blind spot found, not a zero — ContentStrategy §7 / productive failure).
--    Joined to choices by (scenario_slug, sort_order).
-- ----------------------------------------------------------------------------
insert into public.outcomes (choice_id, result_text, explanation, is_correct, xp_reward)
select c.id, v.result_text, v.explanation, v.is_correct, v.xp_reward
from (values
  -- 1 · everyday-flight-risk
  ('everyday-flight-risk', 1,
    'You spend ten hours on the highway and arrive safely — having chosen the statistically riskier option.',
    'That''s the availability heuristic. A week of footage made a crash easy to picture, and the mind reads "easy to recall" as "likely" — even though, mile for mile, flying is far safer than driving. Next time a story rattles you, ask: "Is this actually likely, or just vivid?" and look for the base rate. The same trap follows any dramatic headline — shark attacks, kidnappings, freak accidents.',
    false, 5),
  ('everyday-flight-risk', 2,
    'You book the flight and land in ninety minutes, having judged the risk by the numbers, not the news.',
    'Nicely resisted. The wall-to-wall footage was the availability heuristic pulling at you — making a rare event feel common because it was so easy to recall. You went to the base rate instead of the vivid image, which is exactly the move. Carry it into every scary story: the ease of picturing something is not evidence of how often it happens.',
    true, 20),
  ('everyday-flight-risk', 3,
    'You drive, enjoy the trip, and arrive glad you did.',
    'A fine call — a road trip you''ll genuinely enjoy is a real reason to drive. Just notice what decided it: choosing for the stops and the scenery is honest, while choosing because a week of footage made flying feel deadly would have been the availability heuristic. The skill is separating a real preference from a fear the news planted.',
    false, 5),
  -- 2 · everyday-yogurt-label
  ('everyday-yogurt-label', 1,
    'You spot that the two tubs are identical and choose on what actually matters to you.',
    'Well caught — that was the framing effect trying to work on you. "90% fat-free" and "10% fat" are the same number dressed as a gain instead of a loss, and the gain frame simply feels healthier. You looked past the wording to the fact, which is the whole game. Watch for it everywhere: "95% success" versus "5% failure" is the identical trick.',
    true, 20),
  ('everyday-yogurt-label', 2,
    'You drop the "90% fat-free" tub in your basket, feeling good about the healthy pick.',
    'That''s the framing effect. The two tubs are identical — 90% fat-free is 10% fat — but the gain-framed label reassures while the loss-framed one nags, so the wording chose for you. The counter is quick: restate the claim in the opposite frame and see if you still prefer it. The same move hides in "low fat," "95% success," and every discount-versus-fee.',
    false, 5),
  ('everyday-yogurt-label', 3,
    'You set both aside and go read the full panel on a third tub.',
    'Good instinct — checking the facts is exactly how you beat a label. Just notice the first two tubs were already identical — "90% fat-free" and "10% fat" describe the same yogurt, and only the framing differed. That gap between wording and fact is the framing effect, and reading the real numbers is the reliable way through it.',
    false, 5),
  -- 3 · everyday-jacket-sale
  ('everyday-jacket-sale', 1,
    'You buy the jacket, telling yourself it''s a wardrobe upgrade.',
    'Worth a second look — you already own two similar jackets, so "I could use one" may be the discount talking. When a "was/now" tag is doing the persuading, the crossed-out $180 is an anchor: it sets the reference point that makes $99 feel like a win. The fix is to decide what the thing is worth to you before you see any price. It shows up in every sale sticker and opening offer.',
    false, 5),
  ('everyday-jacket-sale', 2,
    'You buy the jacket, pleased to have saved $81.',
    'That''s anchoring. The crossed-out $180 wasn''t the real question — it was a reference point that made $99 feel like a gain, when the only thing that matters is whether $99 of yours is well spent on a third similar jacket. Try deciding what something is worth to you before you look at the tag. Every "was/now" price, sale, and opening bid runs on this.',
    true, 5),
  ('everyday-jacket-sale', 3,
    'You leave the jacket on the rack and walk on.',
    'Clean decision. The crossed-out $180 was an anchor built to make $99 feel like a steal, and you refused to measure against it — you measured against what a jacket is actually worth to you, with two already at home. That''s the antidote to anchoring: set your own number first. It''ll serve you in every negotiation and every sale.',
    true, 20),
  -- 4 · everyday-neighborhood-alarm
  ('everyday-neighborhood-alarm', 1,
    'You sign the contract that night, and the monthly charges begin.',
    'That''s the availability heuristic. One vivid, detailed story just set your sense of how likely a break-in is — because the mind judges frequency by how easily an example comes to mind, and your neighbor handed you a very easy one. Before a fear-driven purchase, check the actual rate: how common are break-ins here, really? The same pull sells alarms, insurance, and gadgets after every scary anecdote.',
    false, 5),
  ('everyday-neighborhood-alarm', 2,
    'You sleep on it, look up local crime rates in the morning, and decide with a clear head.',
    'Exactly right. That gripping story was the availability heuristic — a single vivid case making a rare event feel imminent. By waiting and checking the base rate, you let the numbers, not the mental image, decide. Keep the habit: when one memorable story spikes your fear, ask how often the thing truly happens before you spend a cent.',
    true, 20),
  ('everyday-neighborhood-alarm', 3,
    'You order the doorbell camera and feel a bit more at ease.',
    'Reasonable — if it''s something you genuinely planned, a modest camera is a fair call. Just check the timing: buying tonight, right after a vivid story, is the availability heuristic nudging your hand. A choice made because a single dramatic tale made danger feel common is worth pausing on — a long-considered one isn''t.',
    false, 5),
  -- 5 · everyday-phone-plan
  ('everyday-phone-plan', 1,
    'You realize both plans describe the same 1% and choose on what actually differs.',
    'Well done — that''s the framing effect neutralized. "99% reliable" and "1 in 100 drops" are the identical fact, one framed as a gain and one as a loss, and the loss frame just felt worse. You went to what genuinely varies — coverage, price, support. That''s the move every time two options are described differently: strip the wording and compare the facts.',
    true, 20),
  ('everyday-phone-plan', 2,
    'You pick the "99% reliable" plan, reassured by how dependable it sounds.',
    'That''s the framing effect. "99% reliable" and "1 in 100 calls may drop" are the same performance — the gain frame simply soothes while the loss frame worries. The tie-breaker was wording, not fact. Restate each claim in the other''s frame and the difference vanishes. Then decide on something real, like coverage where you live. Marketers lean on this constantly.',
    false, 5),
  ('everyday-phone-plan', 3,
    'You choose the "1 in 100" plan, trusting the one that admits its flaws.',
    'Interesting — the "at least they''re honest" feeling swayed you, but both plans state the identical 1% — only the framing differs. That''s still the framing effect, just wearing a virtue. Wording, gain or loss or "refreshingly upfront," shouldn''t be the decider. Compare what actually differs between the plans — coverage, price, service — and choose on that.',
    false, 5),
  -- 6 · everyday-wine-list
  ('everyday-wine-list', 1,
    'You order the $90 bottle, comfortable that it''s the reasonable middle.',
    'That''s anchoring. The $220 at the top wasn''t there to be bought — it was there to make everything beneath it look modest, and it quietly dragged your sense of "reasonable" upward from your usual $40. Set your budget before you open the list, so the top line can''t move it. Menus, tiered subscriptions, and "most popular" middle options all use this.',
    false, 5),
  ('everyday-wine-list', 2,
    'You ask the server, who steers you to a well-paired bottle.',
    'A good, sociable move — but notice a pairing suggestion can still land you near that anchored middle, comfortably above your usual $40. The $220 headline reset what "normal" looks like on this list; that''s anchoring. Keep your own number in mind as you ask, so the recommendation serves your budget rather than the list''s framing.',
    false, 5),
  ('everyday-wine-list', 3,
    'You order around your usual $40 and enjoy it just as much.',
    'Nicely anchored to your own value. The $220 at the top was designed to make the $90 feel sensible and pull you upward — classic anchoring — and you held to what you actually wanted to spend. That''s the counter: decide your number before the list sets one for you. It''ll save you far more than wine money in negotiations and big-ticket buys.',
    true, 20),
  -- 7 · everyday-car-brand
  ('everyday-car-brand', 1,
    'You walk away from a well-reviewed car over a single video.',
    'That''s the availability heuristic. One loud, emotional story outweighed years of reliability data in your head — because vivid, angry examples come to mind easily and feel representative, even when they''re the rare exception. Weigh the base rate over the anecdote: what does the long record say? The same trap lives in one-star reviews and viral horror stories about anything.',
    false, 5),
  ('everyday-car-brand', 2,
    'You keep the years of data in view and stay on track with the car.',
    'Exactly the move. That viral video was the availability heuristic — a single dramatic case masquerading as the norm. You let the reliability record, built from thousands of cars, outweigh one furious clip. Remember it whenever a loud story rattles a well-supported decision: one memorable case is not a base rate, however easy it is to picture.',
    true, 20),
  ('everyday-car-brand', 3,
    'You book an inspection, and the mechanic gives this car a clean bill of health.',
    'Smart — arguably the sharpest option. Rather than argue with the viral video (the availability heuristic, one vivid case posing as the pattern), you sidestepped it entirely by checking this actual car''s condition. That answers the real question the anecdote can''t: is the specific car in front of you sound? Facts about the thing itself beat a stranger''s dramatic story every time.',
    false, 5),
  -- 8 · everyday-card-surcharge
  ('everyday-card-surcharge', 1,
    'You notice the prices match and pick the café you actually prefer.',
    'Well spotted — that''s the framing effect sidestepped. A 2% "surcharge" and a 2% "discount" leave you paying the same, but a surcharge stings as a loss while a discount pleases as a gain. You saw through the wording to the identical money underneath. Do that with every fee and deal: "costs $2 more" and "save $2" are often the very same dollar.',
    true, 20),
  ('everyday-card-surcharge', 2,
    'You cross the street to the café that doesn''t "penalize" you.',
    'That''s the framing effect. The price is identical at both — but "surcharge" reads as a penalty (a loss) while "discount" reads as a reward (a gain), so the wording, not the cost, moved your feet. Restate it plainly: same coffee, same money. Then choose on what''s real — the coffee, the seat, the walk. Fees and discounts are framing''s favorite playground.',
    false, 5),
  ('everyday-card-surcharge', 3,
    'You stay put and pay cash to avoid the surcharge.',
    'Fair enough — but notice you rearranged how you''d pay to dodge a "surcharge" that''s simply the normal price worded as a loss. That''s the framing effect steering a small decision. The 2% is the 2% whether it''s called a surcharge or a forgone discount. Seeing that keeps fee-versus-discount wording from quietly running your choices.',
    false, 5),
  -- 9 · everyday-tip-screen
  ('everyday-tip-screen', 1,
    'You tap "custom" and leave the amount that feels right to you.',
    'Nicely done — you refused the anchor. Those three big buttons set a range, and 25% looked "low" only because it sat beside 35% — the presets quietly define what "normal" is. By choosing your own figure, you judged the tip on its merits, not against numbers a screen picked. Watch for the same setup in suggested donations and default quantities.',
    true, 20),
  ('everyday-tip-screen', 2,
    'You tap 25%, relieved to have picked the smallest option.',
    'That''s anchoring. Twenty-five percent felt modest only because it stood next to 30% and 35% — the screen''s three buttons set your reference range and pulled the whole decision upward from what you''d planned for a counter coffee. Decide your amount before the options load, or tap "custom." Suggested tips, donation presets, and "recommended" quantities all work this way.',
    false, 5),
  ('everyday-tip-screen', 3,
    'You tap 30%, figuring the middle button is the safe bet.',
    'The middle option pulled you — that''s anchoring at work. Those three preset buttons quietly set what "normal" looks like, and the middle always feels responsible by design, nudging a quick counter coffee toward a table-service tip. The counter is simple: decide your number first, then use "custom." The same middle-option gravity shows up in pricing tiers and donation screens.',
    false, 5),
  -- 10 · everyday-medication-worry
  ('everyday-medication-worry', 1,
    'You leave the prescription unfilled, the forum story still vivid in your mind.',
    'That''s the availability heuristic. One gripping post outweighed both "genuinely rare" and your doctor''s advice — because a frightening story is easy to recall, and ease of recall feels like probability. The fix isn''t to ignore the worry but to size it: ask your doctor how often the reaction actually happens. The same trap drives fear after any vivid medical horror story online.',
    false, 5),
  ('everyday-medication-worry', 2,
    'You bring the worry to your doctor, who puts the real odds in perspective.',
    'Exactly right. That forum post was the availability heuristic — a single vivid case making a rare risk feel likely. Instead of letting the easy-to-picture story decide, you asked for the actual rate from someone who knows it. That''s the move for every health scare: take the fear seriously, then anchor it to real numbers rather than the most frightening anecdote you found.',
    true, 20),
  ('everyday-medication-worry', 3,
    'You fill it, but spend the evening deep in strangers'' reviews.',
    'Careful — trawling reviews stacks up more vivid, frightening anecdotes, which feeds the very bias at play: the availability heuristic, where easily recalled stories feel common. Each dramatic post makes the rare reaction feel likelier than it is. A better use of the worry is one question to your doctor about the actual rate, rather than a pile of anecdotes that only inflate the fear.',
    false, 5),
  -- 11 · everyday-gym-annual
  ('everyday-gym-annual', 1,
    'You weigh your track record and choose monthly, keeping your options open.',
    'Sharp — you saw past the frame. "Save 20%" packages the yearly plan as a pure gain and hides the real question: given that you''ve drifted off before, will you still be going in month four? You priced in that risk instead of the headline saving. That''s the counter to the framing effect: strip the "save X%" wrapper and ask what you''re honestly likely to use.',
    true, 20),
  ('everyday-gym-annual', 2,
    'You pay $384 up front, pleased to have locked in the saving.',
    'That''s the framing effect. "Save 20%" frames the yearly plan as a gain you''d be foolish to miss — but it quietly buries the question that matters: whether you''ll keep going, when past sign-ups faded after a few months. A saving on something you stop using isn''t a saving. Strip the frame and ask what you''ll realistically use. "Save X%" bulk deals lean on this constantly.',
    false, 5),
  ('everyday-gym-annual', 3,
    'You pay yearly, planning to let the spent money push you to show up.',
    'Notice the plan: "I''ll motivate myself with money already spent." That blends the framing effect ("save 20%!") with the trap of throwing effort after a sunk cost — and it''s exactly how good money follows a fading habit. Spent money can''t make you enjoy the gym. Decide on your realistic likelihood of going, not on a saving or on guilt about a payment.',
    false, 5),
  -- 12 · everyday-marketplace-price
  ('everyday-marketplace-price', 1,
    'You walk away and keep scrolling for another bike.',
    'No harm done — but you may have left real leverage on the table. The seller''s $400 was an anchor, not the bike''s value (~$250), and it made the whole thing feel overpriced and not worth the effort. Anchoring cuts both ways: it can push you to overpay or scare you off a fair deal. Knowing the real value would have let you negotiate from strength.',
    false, 5),
  ('everyday-marketplace-price', 2,
    'You offer $360, feeling you''ve driven a fair bargain below asking.',
    'That''s anchoring. Your "discount" was measured against the seller''s $400, not the bike''s real ~$250 value — so an offer $110 above the going rate felt like a win. The listing price hijacked your reference point. The fix: know the market value before you negotiate and anchor your offer to that, not to their number. Opening bids and sticker prices work exactly this way.',
    false, 5),
  ('everyday-marketplace-price', 3,
    'You open near $250, and the seller — after some back-and-forth — comes down close to it.',
    'That''s how you beat an anchor. Instead of measuring against the seller''s $400, you anchored to what the bike is actually worth (~$250) and opened there — resetting the whole negotiation around real value. Anchoring only works if you accept the other side''s number as the starting point. Bring your own, backed by the market, to every negotiation and big purchase.',
    true, 20)
) as v(scenario_slug, sort_order, result_text, explanation, is_correct, xp_reward)
join public.scenarios sc on sc.slug = v.scenario_slug
join public.scenario_choices c on c.scenario_id = sc.id and c.sort_order = v.sort_order;

-- ----------------------------------------------------------------------------
-- 5. scenario_biases — each scenario teaches exactly its one primary bias.
-- ----------------------------------------------------------------------------
insert into public.scenario_biases (scenario_id, bias_id)
select sc.id, b.id
from (values
  ('everyday-flight-risk',        'availability-heuristic'),
  ('everyday-yogurt-label',       'framing-effect'),
  ('everyday-jacket-sale',        'anchoring'),
  ('everyday-neighborhood-alarm', 'availability-heuristic'),
  ('everyday-phone-plan',         'framing-effect'),
  ('everyday-wine-list',          'anchoring'),
  ('everyday-car-brand',          'availability-heuristic'),
  ('everyday-card-surcharge',     'framing-effect'),
  ('everyday-tip-screen',         'anchoring'),
  ('everyday-medication-worry',   'availability-heuristic'),
  ('everyday-gym-annual',         'framing-effect'),
  ('everyday-marketplace-price',  'anchoring')
) as v(scenario_slug, bias_slug)
join public.scenarios sc on sc.slug = v.scenario_slug
join public.biases b on b.slug = v.bias_slug;

-- ----------------------------------------------------------------------------
-- 6. scenario_pack_items — order the 12 scenarios within Everyday Traps
--    (availability -> framing -> anchoring rotation, rising subtlety).
-- ----------------------------------------------------------------------------
insert into public.scenario_pack_items (pack_id, scenario_id, sort_order)
select p.id, sc.id, v.sort_order
from (values
  ('everyday-flight-risk',        1),
  ('everyday-yogurt-label',       2),
  ('everyday-jacket-sale',        3),
  ('everyday-neighborhood-alarm', 4),
  ('everyday-phone-plan',         5),
  ('everyday-wine-list',          6),
  ('everyday-car-brand',          7),
  ('everyday-card-surcharge',     8),
  ('everyday-tip-screen',         9),
  ('everyday-medication-worry',   10),
  ('everyday-gym-annual',         11),
  ('everyday-marketplace-price',  12)
) as v(scenario_slug, sort_order)
cross join (select id from public.scenario_packs where slug = 'everyday-traps') p
join public.scenarios sc on sc.slug = v.scenario_slug;

-- ----------------------------------------------------------------------------
-- 7. Publish the pack — it now has a full, quality-checked scenario library,
--    so the empty-state concern from Phase 5C is resolved.
-- ----------------------------------------------------------------------------
update public.scenario_packs
  set is_published = true, updated_at = now()
  where slug = 'everyday-traps';
