-- ============================================================================
-- MindShift — Phase 5D.2: "Money & Spending" Scenario Library
-- ============================================================================
-- Seeds the full playable content for the ONE pack "money-and-spending"
-- (Phase 5C): 12 authored scenarios, choices, outcomes, bias links, pack items,
-- then publishes the pack. Structure/quality mirror the Everyday Traps
-- benchmark (20260723000003) exactly.
--
-- Scope — Money & Spending only. No other pack touched. No schema changes, no
-- new tables, no RLS changes, no gameplay/edge code.
--
-- Biases taught (the 4 assigned to this pack), ~3 primary each, two scenarios
-- combine reinforcing biases (ContentStrategy §2, §3):
--   anchoring           (family: value-anchoring)
--   framing-effect      (family: decision-framing)
--   loss-aversion       (family: decision-framing)
--   sunk-cost-fallacy   (family: value-anchoring)
--
-- Arc: easy -> medium. Early scenarios isolate one bias in a clear money
-- situation; later ones grow subtler and combine reinforcing pairs
-- (losing stock = loss-aversion + sunk cost; renewal = framing + loss-aversion).
--
-- Outcome split: result_text = "what happened"; explanation = bias -> mechanism
-- -> counter -> transfer (five-part, ContentStrategy §7). Correct outcomes teach.
-- Correct-answer POSITION varied across scenarios (§6). XP: correct 20, else 5.
--
-- Reflection prompts (by scenario slug):
--   money-discount-vs-flat     : When did a "save $X" banner make you buy something you'd have skipped at the same flat price?
--   money-store-card-cashback  : Have you ever taken a reward you didn't need, just to avoid "missing out" on it?
--   money-online-course        : What have you kept going with mainly because you'd already paid for it?
--   money-salary-anchor        : In a negotiation, did the first number said shape the whole conversation?
--   money-phone-insurance      : When did fear of a rare, vivid loss lead you to overpay for protection?
--   money-laptop-emi           : Has a small monthly figure ever hidden a bigger total you'd never have agreed to at once?
--   money-flight-timer         : When did a countdown or a crossed-out price rush you into buying?
--   money-prepaid-trip         : What have you done purely so a past payment wouldn't "go to waste"?
--   money-grocery-cashback     : Have you ever spent more to "earn" a reward that netted you nothing?
--   money-used-couch           : When selling something, did what you paid for it distort what you asked?
--   money-losing-stock         : Have you held onto something failing just to avoid admitting the loss?
--   money-subscription-renewal : When did "you'll lose your history/settings" keep you paying for something you didn't use?
--
-- Idempotency: all scenarios use the `money-` slug prefix (unique to this pack).
-- Re-running deletes this pack's child rows and re-inserts; scenarios upsert on
-- slug so UUIDs stay stable. Safe pre-launch (no attempts reference these yet).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. scenarios — 12 rows. category_id = the PRIMARY bias's family, by slug.
-- ----------------------------------------------------------------------------
insert into public.scenarios
  (slug, title, context, stakes, difficulty, category_id, source, status, version)
values
  (
    'money-discount-vs-flat',
    'Save Thirty Dollars',
    'You''re buying a $120 gadget online. One store''s page is bright with "Save $30 — today only!" A rival store lists the identical gadget at $90 flat, no banner, no timer. After the discount, both cost the same $90. The first page just feels like the better deal.',
    'The same $90 either way — and whether a banner decides where you buy.',
    'easy',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'money-store-card-cashback',
    'Free Money at the Register',
    'At checkout with a $200 purchase, the clerk offers a store credit card: 5% cashback today — that''s $10 off. It means a hard credit check, and cards like it carry 24% interest if you ever hold a balance. Turning down $10 of "free money" feels like leaving cash on the table.',
    '$10 today against a credit ding and a high-interest card you didn''t plan to open.',
    'easy',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'money-online-course',
    'Six Weeks In',
    'You paid $300 for a 12-week online course. Six weeks in, it''s dull and you''ve learned little — and a free resource actually covers the same ground better. Finishing means 30 more hours you''d rather spend elsewhere. But that $300 keeps nagging at you.',
    '30 hours of your time, weighed against $300 already gone.',
    'easy',
    (select id from public.categories where slug = 'value-anchoring'),
    'authored', 'published', 1
  ),
  (
    'money-salary-anchor',
    'What Do You Currently Earn?',
    'A recruiter offers you a role and asks what you currently make. You earn $70k; the market rate for this job is closer to $95k. Whatever number you say first will frame every figure that follows. She waits, pen ready.',
    'Up to $25k a year, and whether your old salary sets your new one.',
    'easy',
    (select id from public.categories where slug = 'value-anchoring'),
    'authored', 'published', 1
  ),
  (
    'money-phone-insurance',
    'The Eighty-Dollar Worry',
    'Buying a $400 phone, the clerk offers accidental-damage cover: $80 for a year. Phones like yours break maybe once in a dozen years of use, and a screen repair runs about $120. The pitch lands on one word: "For $80, never risk a $400 loss."',
    '$80 now against a rare repair you could likely cover yourself.',
    'medium',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'money-laptop-emi',
    'Just a Hundred a Month',
    'A $1,200 laptop. The site pushes "12 months, only $110/month!" in bold, with the full price greyed out below. That works out to $1,320 — $120 more than paying once, at no benefit you need. You can comfortably afford either way. The monthly number just feels painless.',
    'An extra $120 for nothing, hidden behind an easy monthly figure.',
    'medium',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'money-flight-timer',
    'Was Five-Twenty, Now Four-Ten',
    'A booking site shows your route: "Was $520, now $410," a red timer counting down beside it. You never once saw it priced at $520. Comparable flights a day either side sit around $300. Against that $520, the $410 feels like a rescue.',
    'Around $110, and whether a price you never saw sets your sense of a deal.',
    'medium',
    (select id from public.categories where slug = 'value-anchoring'),
    'authored', 'published', 1
  ),
  (
    'money-prepaid-trip',
    'Storms All Weekend',
    'You prepaid $600, non-refundable, for a weekend trip. The forecast has turned to storms, you''re worn out, and honestly you''d rather rest. Going means a tiring, soggy weekend; staying means a restful one. The $600 is gone whichever you choose.',
    'A weekend you can''t get back, against $600 you already can''t.',
    'medium',
    (select id from public.categories where slug = 'value-anchoring'),
    'authored', 'published', 1
  ),
  (
    'money-grocery-cashback',
    'Spend Seventy-Five, Get Fifteen',
    'Your online grocery order sits at $60. A banner appears: "Spend $75, get $15 cashback!" You hadn''t planned to spend $75. Adding $15 of things you don''t really need would "earn" you $15 back — netting nothing, plus a cupboard of stuff you didn''t want.',
    '$15 of things you don''t need, chasing $15 that cancels it out.',
    'medium',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'money-used-couch',
    'You Paid Eight Hundred',
    'You''re selling your two-year-old couch online. It cost you $800 new. Comparable used couches list for around $200, but $200 feels insulting for a couch that was $800, so you''re tempted to list at $500 and "hold firm."',
    'Weeks of no buyers, or a fair price the market will actually pay.',
    'medium',
    (select id from public.categories where slug = 'value-anchoring'),
    'authored', 'published', 1
  ),
  (
    'money-losing-stock',
    'Down Twenty a Share',
    'A stock you bought at $50 now trades at $30. Its fundamentals have quietly weakened — if it were $30 today, with what you now know, you''d never buy it. Selling "locks in" a $20-a-share loss. Holding means hoping it crawls back to what you paid.',
    'The rest of your money''s time, tied to getting back to a number that''s gone.',
    'medium',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'money-subscription-renewal',
    'Don''t Lose Your History',
    'Your annual $99 software renews tomorrow. You''ve opened it twice all year. Canceling is one click — but the retention page flashes "Stay for 50% off, and don''t lose your saved settings and history!" Losing that history stings, even though you barely touch the tool.',
    '$50 to keep something you don''t use, or a clean cancel.',
    'medium',
    (select id from public.categories where slug = 'decision-framing'),
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
-- 2. Idempotency — clear this pack's child rows (outcomes cascade from choices).
-- ----------------------------------------------------------------------------
delete from public.scenario_pack_items
  where scenario_id in (select id from public.scenarios where slug like 'money-%');
delete from public.scenario_biases
  where scenario_id in (select id from public.scenarios where slug like 'money-%');
delete from public.scenario_choices
  where scenario_id in (select id from public.scenarios where slug like 'money-%');

-- ----------------------------------------------------------------------------
-- 3. scenario_choices — 3 per scenario. Trap choices carry the target bias_id.
-- ----------------------------------------------------------------------------
insert into public.scenario_choices (scenario_id, label, body, is_trap, bias_id, sort_order)
select sc.id, v.label, null, v.is_trap, b.id, v.sort_order
from (values
  -- 1 · money-discount-vs-flat (framing) — correct @ 3
  ('money-discount-vs-flat', 1, 'Buy from the first store — a $30 saving today is worth grabbing.', true,  'framing-effect'),
  ('money-discount-vs-flat', 2, 'Buy from the first store anyway; the bright deal page feels more trustworthy.', false, null),
  ('money-discount-vs-flat', 3, 'Notice both come to $90 and choose on shipping, returns, or reviews.', false, null),
  -- 2 · money-store-card-cashback (loss-aversion) — correct @ 1
  ('money-store-card-cashback', 1, 'Decline — $10 isn''t worth a hard credit check and a 24% card.', false, null),
  ('money-store-card-cashback', 2, 'Take it — passing up free cashback feels like wasting money.', true,  'loss-aversion'),
  ('money-store-card-cashback', 3, 'Take the card, but promise yourself you''ll never actually use it.', false, null),
  -- 3 · money-online-course (sunk-cost) — correct @ 2
  ('money-online-course', 1, 'Push through to the end — you paid $300, you should finish it.', true,  'sunk-cost-fallacy'),
  ('money-online-course', 2, 'Switch to the free resource; the $300 is gone either way, and your time isn''t.', false, null),
  ('money-online-course', 3, 'Skim it at double speed just to say you completed it.', false, null),
  -- 4 · money-salary-anchor (anchoring) — correct @ 1
  ('money-salary-anchor', 1, 'Steer to the role''s market worth — give a target range around $95k, not your current pay.', false, null),
  ('money-salary-anchor', 2, 'Answer plainly: say $70k — it''s the truth and a fair starting point.', true,  'anchoring'),
  ('money-salary-anchor', 3, 'Say $70k but add that you''re "flexible and open to their range."', false, null),
  -- 5 · money-phone-insurance (loss-aversion) — correct @ 3
  ('money-phone-insurance', 1, 'Buy it — $80 is worth never facing that $400 hit.', true,  'loss-aversion'),
  ('money-phone-insurance', 2, 'Buy a sturdy case and screen protector instead, and take the cover too.', false, null),
  ('money-phone-insurance', 3, 'Skip it — the likely cost of damage is well under $80; self-insure and keep the cash.', false, null),
  -- 6 · money-laptop-emi (framing) — correct @ 2
  ('money-laptop-emi', 1, 'Take the plan — $110 a month is easy to absorb.', true,  'framing-effect'),
  ('money-laptop-emi', 2, 'Pay in full — the monthly framing hides $120 extra for no benefit you need.', false, null),
  ('money-laptop-emi', 3, 'Take the plan, but set reminders so you never miss a payment.', false, null),
  -- 7 · money-flight-timer (anchoring) — correct @ 3
  ('money-flight-timer', 1, 'Book the $410 before the timer runs out — it''s $110 off.', true,  'anchoring'),
  ('money-flight-timer', 2, 'Book it; $410 fits your budget and the timing suits you.', false, null),
  ('money-flight-timer', 3, 'Check nearby dates first — the "$520" and the timer are doing the persuading, not the price.', false, null),
  -- 8 · money-prepaid-trip (sunk-cost) — correct @ 1
  ('money-prepaid-trip', 1, 'Stay home and rest — the $600 is spent regardless; only the weekend is still yours to choose.', false, null),
  ('money-prepaid-trip', 2, 'Go — you paid $600, you can''t just let it go to waste.', true,  'sunk-cost-fallacy'),
  ('money-prepaid-trip', 3, 'Go for one day to "get some value" out of it.', false, null),
  -- 9 · money-grocery-cashback (framing) — correct @ 2
  ('money-grocery-cashback', 1, 'Add $15 more to unlock the $15 cashback.', true,  'framing-effect'),
  ('money-grocery-cashback', 2, 'Check out at $60 — "earning" $15 by spending $15 you don''t need is a wash at best.', false, null),
  ('money-grocery-cashback', 3, 'Add items only if something on your real list gets you near $75 anyway.', false, null),
  -- 10 · money-used-couch (anchoring) — correct @ 3
  ('money-used-couch', 1, 'List at $500 — it was an $800 couch, it''s worth more than $200.', true,  'anchoring'),
  ('money-used-couch', 2, 'List at $350 as a compromise and wait for a buyer.', false, null),
  ('money-used-couch', 3, 'Price near the ~$200 the market pays; what you paid isn''t what buyers will.', false, null),
  -- 11 · money-losing-stock (loss-aversion + sunk cost) — correct @ 2
  ('money-losing-stock', 1, 'Hold until it climbs back to $50 — selling now just realizes the loss.', true,  'loss-aversion'),
  ('money-losing-stock', 2, 'Ask only whether you''d buy it today at $30; if not, sell and redeploy the cash.', false, null),
  ('money-losing-stock', 3, 'Buy more to "average down" your cost per share.', false, null),
  -- 12 · money-subscription-renewal (framing + loss-aversion) — correct @ 1
  ('money-subscription-renewal', 1, 'Cancel — you barely use it; the "lose your history" line is built to make quitting sting.', false, null),
  ('money-subscription-renewal', 2, 'Take the 50% off — half price, and you keep everything.', true,  'loss-aversion'),
  ('money-subscription-renewal', 3, 'Renew at full price; maybe you''ll use it more next year.', false, null)
) as v(scenario_slug, sort_order, label, is_trap, bias_slug)
join public.scenarios sc on sc.slug = v.scenario_slug
left join public.biases b on b.slug = v.bias_slug;

-- ----------------------------------------------------------------------------
-- 4. outcomes — one per choice. result_text = what happened; explanation =
--    bias -> mechanism -> counter -> transfer. Joined by (scenario_slug, sort).
-- ----------------------------------------------------------------------------
insert into public.outcomes (choice_id, result_text, explanation, is_correct, xp_reward)
select c.id, v.result_text, v.explanation, v.is_correct, v.xp_reward
from (values
  -- 1 · money-discount-vs-flat
  ('money-discount-vs-flat', 1,
    'You buy from the flashier store, pleased to have "saved $30" — and pay exactly what the plain store charged.',
    'That''s the framing effect. "Save $30" frames the price as a gain, while the plain $90 tag offers no such story — yet the money is identical. The counter is to compare final prices, not the wrapper around them. The same trick runs every "was/now" tag, "bonus," and "limited-time saving."',
    false, 5),
  ('money-discount-vs-flat', 2,
    'You buy from the first store on a gut sense that the lively deal page is more trustworthy.',
    'Notice what earned that trust: a "Save $30!" banner, which is the framing effect at work — presentation, not substance. A bright discount page isn''t evidence of a better price or seller. Judge stores on real signals — returns policy, reviews, delivery — and compare the actual $90 both are charging.',
    false, 5),
  ('money-discount-vs-flat', 3,
    'You see both land at $90 and pick on delivery and returns instead.',
    'Well done — you stripped the frame. "Save $30" and a plain $90 tag are the same price dressed two ways, and you compared substance over presentation. Carry it to every sale: a discount is only real against a price you''d otherwise have paid, not against a number the seller invented.',
    true, 20),
  -- 2 · money-store-card-cashback
  ('money-store-card-cashback', 1,
    'You decline, pay normally, and walk out with your credit and your evening intact.',
    'Nicely resisted. Turning down the $10 felt like a loss, and that sting is loss aversion — we feel a forgone gain far more than its small size warrants. You weighed it against the real costs (a hard credit pull, a 24% card) instead. Watch for it in every "don''t miss out" reward and one-time offer.',
    true, 20),
  ('money-store-card-cashback', 2,
    'You open the card for the $10, and the credit check and account come with it.',
    'That''s loss aversion. Passing up $10 felt like losing money, so the tiny gain loomed larger than a hard credit inquiry and a high-interest account. A forgone bonus isn''t a loss — it''s just money you never had. Size the actual costs against the reward before saying yes; retailers bank on the fear of missing out.',
    false, 5),
  ('money-store-card-cashback', 3,
    'You take the card promising never to use it — and now carry the credit hit and the temptation anyway.',
    'The promise is how the offer wins: loss aversion made the $10 feel unmissable, so you accepted real downsides (the credit check, an open high-interest line) for a small gain and a rule you hope to keep. A forgone bonus is money you never had, not a loss. Decline offers whose costs outweigh the reward.',
    false, 5),
  -- 3 · money-online-course
  ('money-online-course', 1,
    'You grind through six more dull weeks, learning little, because the $300 was already spent.',
    'That''s the sunk cost fallacy. The $300 is gone whether you continue or not, yet it pulled you into spending 30 more hours you''d value elsewhere. The only live question is future value from here. Ask "starting today, is this the best use of my time?" — it applies to finished-because-I-paid movies, meals, and memberships alike.',
    false, 5),
  ('money-online-course', 2,
    'You switch to the free resource and start actually learning the material.',
    'Exactly right. You ignored the $300 — it''s gone on every path — and judged only what''s still yours to spend: 30 hours. That''s the antidote to the sunk cost fallacy: decide by future value, not past outlay. It frees you from failing projects, bad subscriptions, and any "but I already paid" trap.',
    true, 20),
  ('money-online-course', 3,
    'You skim the rest at double speed, retaining little, just to mark it "done."',
    'Completing it changes nothing about the $300 — that''s already spent — so this is the sunk cost fallacy wearing the mask of discipline. Rushing through low-value hours to honor a past payment still spends the one resource you have left: your time. Judge from here forward, and let the free, better resource win.',
    false, 5),
  -- 4 · money-salary-anchor
  ('money-salary-anchor', 1,
    'You anchor to the role''s market worth, and the offer lands far above your old salary.',
    'That''s how you beat anchoring. The first number named sets the range the whole talk drifts around — so you set it deliberately, on the job''s value (~$95k), not your past pay. Whoever anchors first shapes the outcome. Bring your own well-researched number to salary talks, rent, and any negotiation.',
    true, 20),
  ('money-salary-anchor', 2,
    'You say $70k, and every figure that follows clusters just above it.',
    'That''s anchoring. Your current salary became the reference point for an offer that should have been priced on the role''s market value (~$95k), quietly capping you thousands below. The fix: anchor first, to the job''s worth, and deflect the "current salary" question. Opening numbers frame negotiations, rents, and prices everywhere.',
    false, 5),
  ('money-salary-anchor', 3,
    'You give $70k and call yourself flexible; the offer still forms around $70k.',
    '"Flexible" doesn''t undo the anchor — once $70k is on the table, it''s the reference point every figure adjusts from, and adjustments are always too small. That''s anchoring. The move is to never set a low anchor: answer the "current salary" question with your target range, built on the role''s market value.',
    false, 5),
  -- 5 · money-phone-insurance
  ('money-phone-insurance', 1,
    'You buy the $80 cover and feel safer — having paid well above what the risk is worth.',
    'That''s loss aversion. The vivid "$400 loss" loomed so large that $80 felt like cheap peace of mind, even though the expected cost of damage is far lower. Prudence weighs the odds; loss aversion overweights the loss itself. For risks you can comfortably absorb, self-insuring usually wins — this is how extended warranties are sold.',
    false, 5),
  ('money-phone-insurance', 2,
    'You buy a case and protector and add the cover too — belt, braces, and an $80 premium.',
    'Sensible protection, but notice you still bought the $80 cover on top, driven by the dread of a "$400 loss" — that''s loss aversion. Once the case makes damage even less likely, the premium is even harder to justify. Protect the phone cheaply, then let the odds, not the fear, decide on paid cover.',
    false, 5),
  ('money-phone-insurance', 3,
    'You skip the cover, pocket the $80, and set it aside toward any future repair.',
    'Well judged. The pitch leaned on a vivid "$400 loss" to trigger loss aversion — overweighting a rare, dramatic outcome. You compared the real expected cost (a repair well under $80, and unlikely) and self-insured. Use it for any risk you can absorb: warranties and add-on insurance sell the fear, not the math.',
    true, 20),
  -- 6 · money-laptop-emi
  ('money-laptop-emi', 1,
    'You take the plan; twelve easy payments quietly add up to $1,320.',
    'That''s the framing effect. Splitting the cost into "$110/month" frames it as painless and hides the full $1,320 — $120 more than paying once, for no benefit you need. The counter is to convert any monthly offer to its total before deciding. Installments, "just $X a day" pitches, and financing all lean on this.',
    false, 5),
  ('money-laptop-emi', 2,
    'You pay once at $1,200 and skip the $120 the plan quietly added.',
    'Exactly right. You saw past the "$110/month" frame to the total, $1,320, and refused to pay $120 for nothing. That''s the fix for framing: restate a small recurring figure as its full sum before choosing. It protects you from installment markups, "per day" pricing, and financing dressed up as convenience.',
    true, 20),
  ('money-laptop-emi', 3,
    'You take the plan and set diligent reminders — paying the extra $120 right on schedule.',
    'The reminders solve the wrong problem. The issue isn''t missing a payment; it''s that the "$110/month" frame hid a $120 premium for no benefit you need — the framing effect. Perfect payments still cost you the extra. Convert monthly offers to their total first; unless it''s genuinely 0% and useful, paying once wins.',
    false, 5),
  -- 7 · money-flight-timer
  ('money-flight-timer', 1,
    'You book the $410 in a rush, sure you rescued $110.',
    'That''s anchoring — sharpened by a countdown. The "$520" you never actually saw set a high reference point that made $410 feel like a win, while comparable flights sit near $300. The timer added pressure so you wouldn''t check. Ignore the crossed-out number, compare real prices across dates, and never let a clock rush the math.',
    false, 5),
  ('money-flight-timer', 2,
    'You book at $410 because it fits your budget and the timing works.',
    'Fair reasons — but notice "fits my budget" formed against the "$520" anchor, not the real market near $300. That inflated reference is anchoring, and the timer discouraged checking. Even when a price is affordable, compare it to what the thing actually costs elsewhere before the crossed-out number and the clock decide for you.',
    false, 5),
  ('money-flight-timer', 3,
    'You check nearby dates, find fares near $300, and book with the anchor stripped away.',
    'Well played. The "$520 was" was a decoy anchor and the timer was there to stop you looking — classic anchoring under pressure. By comparing real prices across dates, you judged $410 against what flights truly cost (~$300), not against an invented high. Do this with every "was/now" and countdown deal.',
    true, 20),
  -- 8 · money-prepaid-trip
  ('money-prepaid-trip', 1,
    'You stay home, rest, and let the weekend be the good one it can still be.',
    'Exactly right. The $600 is gone whether you travel or not — that''s a sunk cost, and it shouldn''t buy you a miserable weekend on top. You judged the only live choice: how to spend the two days that are still yours. Apply it to concert tickets, prepaid plans, and anything "I already paid, so I have to."',
    true, 20),
  ('money-prepaid-trip', 2,
    'You drag yourself out into the storms so the $600 won''t "go to waste."',
    'That''s the sunk cost fallacy. The $600 is spent no matter what you do now — going can''t recover it, it only adds a wretched weekend to the bill. The rational question is what makes the next two days best, full stop. "I''d be wasting it otherwise" is the exact thought that keeps people in bad plans and projects.',
    false, 5),
  ('money-prepaid-trip', 3,
    'You go for one day to "get some value," and spend it tired and rained on.',
    'Half a trip to honor a sunk cost is still the sunk cost fallacy — the $600 is gone either way, and a single soggy day doesn''t claw any of it back; it just spends more of your weekend. Salvaging "some value" from spent money is a trap. Decide the next two days on their own merits, cost aside.',
    false, 5),
  -- 9 · money-grocery-cashback
  ('money-grocery-cashback', 1,
    'You pad the cart to $75, "earn" $15 back, and end up with $15 of clutter you didn''t want.',
    'That''s the framing effect. "Get $15 cashback" frames spending more as earning, when adding $15 you don''t need to reclaim $15 nets zero — minus the unwanted goods. Reframe it as "spend $15 extra to save $15" and the spell breaks. Minimum-spend offers and "free shipping over $X" run on exactly this.',
    false, 5),
  ('money-grocery-cashback', 2,
    'You check out at $60, skipping the padding and the "reward."',
    'Well judged. The cashback framed extra spending as a gain, but you saw the real trade — $15 out to get $15 back is a wash at best, worse once you count what you didn''t need. That''s the counter to framing: restate the offer as the money leaving your pocket. Threshold rewards and free-shipping minimums use this everywhere.',
    true, 20),
  ('money-grocery-cashback', 3,
    'You reach $75 only because things you actually needed were on the list, and pocket the $15.',
    'Reasonable — if the extra items were genuinely on your list, the cashback is a real bonus, not bait. The trap is buying filler to hit the threshold, which is the framing effect turning "spend more" into "earn." The test: would you buy these anyway at full price? If yes, take the reward; if no, skip it.',
    false, 5),
  -- 10 · money-used-couch
  ('money-used-couch', 1,
    'You list at $500; weeks pass with no serious buyers.',
    'That''s anchoring — to your own purchase price. The $800 you paid feels like the couch''s worth, but buyers price against today''s used market (~$200), not your receipt. Sellers who anchor to what they paid sit unsold. Price to comparable listings, not your cost, whether you''re selling a couch, a car, or a house.',
    false, 5),
  ('money-used-couch', 2,
    'You split the difference at $350 and wait, still drawing more silence than offers.',
    'Better, but $350 is still anchored to the $800 you paid rather than the ~$200 the market pays. "Compromising" between your cost and reality just lands on a slower version of overpriced. That pull toward your purchase price is anchoring. Set the price from comparable sales; what you paid is irrelevant to what a buyer will.',
    false, 5),
  ('money-used-couch', 3,
    'You price near $200, the market rate, and line up a buyer within days.',
    'Exactly right. You anchored to what buyers actually pay (~$200), not to your $800 receipt — which is the couch''s past, not its market value. Beating anchoring means choosing the relevant reference point on purpose. It sells couches fast and, more importantly, prices your car, home, and freelance work realistically.',
    true, 20),
  -- 11 · money-losing-stock
  ('money-losing-stock', 1,
    'You hold for the rebound to $50, money frozen in a position you''d never choose today.',
    'That''s loss aversion feeding a sunk cost. Selling feels like "accepting" the loss, so you cling to the $50 you paid — a number the market has forgotten — hoping to get back to even. But the loss already happened; refusing to sell doesn''t undo it, it just ties up cash in a weakening bet. The purchase price is irrelevant to what to do now.',
    false, 5),
  ('money-losing-stock', 2,
    'You ask if you''d buy it fresh at $30, answer no, and move the money somewhere better.',
    'Exactly the right test. It sidesteps two traps at once: loss aversion (needing to "get back to even") and the sunk cost of your $50 purchase price. "Would I buy this today?" ignores history and judges the position on its future. Use it for investments, projects, and commitments — the entry price is not a reason to stay.',
    true, 20),
  ('money-losing-stock', 3,
    'You buy more at $30 to lower your average cost, doubling down on a weakening bet.',
    'Averaging down here is loss aversion in disguise — the move is aimed at your cost basis ($50), not at whether the stock is worth owning now. Lowering the number you "need" to break even is about easing the loss, not about the investment''s future. Decide by "would I buy this today?" — if the fundamentals have weakened, adding money compounds the mistake.',
    false, 5),
  -- 12 · money-subscription-renewal
  ('money-subscription-renewal', 1,
    'You cancel in one click and stop paying for a tool you never open.',
    'Well done — you saw through a double play. "Don''t lose your history" frames canceling as a loss (the framing effect), and that dread of losing your saved data is loss aversion, even though you barely use the tool. Judge the renewal on real use, not on what you''d "lose." Retention pages everywhere run this exact script.',
    true, 20),
  ('money-subscription-renewal', 2,
    'You take the 50% off to keep your history — and keep paying for a tool you open twice a year.',
    'That''s the framing effect and loss aversion together. "Don''t lose your settings and history" frames leaving as a loss, and half-price makes staying feel like a win — but you still pay $50 for something you scarcely use. The discount is only a saving if you''d use the tool. Decide on actual use, not on avoiding a loss the page invented.',
    false, 5),
  ('money-subscription-renewal', 3,
    'You renew at full price on the hope you''ll use it more next year.',
    'That hope is doing a lot of work. You barely touched it this year, so renewing at full price bets on a change with no evidence — and the "lose your history" nudge (framing plus loss aversion) greased the decision. Judge subscriptions on your real usage, not intentions; if the pattern says twice a year, let it go.',
    false, 5)
) as v(scenario_slug, sort_order, result_text, explanation, is_correct, xp_reward)
join public.scenarios sc on sc.slug = v.scenario_slug
join public.scenario_choices c on c.scenario_id = sc.id and c.sort_order = v.sort_order;

-- ----------------------------------------------------------------------------
-- 5. scenario_biases — primary bias per scenario; combined scenarios list both.
-- ----------------------------------------------------------------------------
insert into public.scenario_biases (scenario_id, bias_id)
select sc.id, b.id
from (values
  ('money-discount-vs-flat',     'framing-effect'),
  ('money-store-card-cashback',  'loss-aversion'),
  ('money-online-course',        'sunk-cost-fallacy'),
  ('money-salary-anchor',        'anchoring'),
  ('money-phone-insurance',      'loss-aversion'),
  ('money-laptop-emi',           'framing-effect'),
  ('money-flight-timer',         'anchoring'),
  ('money-prepaid-trip',         'sunk-cost-fallacy'),
  ('money-grocery-cashback',     'framing-effect'),
  ('money-used-couch',           'anchoring'),
  ('money-losing-stock',         'loss-aversion'),
  ('money-losing-stock',         'sunk-cost-fallacy'),
  ('money-subscription-renewal', 'framing-effect'),
  ('money-subscription-renewal', 'loss-aversion')
) as v(scenario_slug, bias_slug)
join public.scenarios sc on sc.slug = v.scenario_slug
join public.biases b on b.slug = v.bias_slug;

-- ----------------------------------------------------------------------------
-- 6. scenario_pack_items — order within Money & Spending (easy -> medium).
-- ----------------------------------------------------------------------------
insert into public.scenario_pack_items (pack_id, scenario_id, sort_order)
select p.id, sc.id, v.sort_order
from (values
  ('money-discount-vs-flat',     1),
  ('money-store-card-cashback',  2),
  ('money-online-course',        3),
  ('money-salary-anchor',        4),
  ('money-phone-insurance',      5),
  ('money-laptop-emi',           6),
  ('money-flight-timer',         7),
  ('money-prepaid-trip',         8),
  ('money-grocery-cashback',     9),
  ('money-used-couch',           10),
  ('money-losing-stock',         11),
  ('money-subscription-renewal', 12)
) as v(scenario_slug, sort_order)
cross join (select id from public.scenario_packs where slug = 'money-and-spending') p
join public.scenarios sc on sc.slug = v.scenario_slug;

-- ----------------------------------------------------------------------------
-- 7. Publish the pack — it now has a full, quality-checked scenario library.
-- ----------------------------------------------------------------------------
update public.scenario_packs
  set is_published = true, updated_at = now()
  where slug = 'money-and-spending';
