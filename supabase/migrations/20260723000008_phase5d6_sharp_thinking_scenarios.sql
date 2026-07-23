-- ============================================================================
-- MindShift — Phase 5D.6: "Sharp Thinking" Scenario Library (CAPSTONE)
-- ============================================================================
-- Full playable content for the ONE pack "sharp-thinking" (Phase 5C): 12
-- scenarios, choices, outcomes, bias links, pack items, then publish.
-- Structure/quality mirror the Everyday Traps benchmark (20260723000003).
--
-- Scope — Sharp Thinking only. No schema changes, no new tables, no RLS/gameplay.
--
-- The capstone (ContentStrategy §2 "combine reinforcing pairs at higher
-- difficulty", §4 Expert tier). EVERY scenario combines 2-3 reinforcing biases,
-- and the pack collectively exercises ALL 12 MVP biases — including recency-bias
-- and hindsight-bias, which get their deepest treatment here. Scenarios are
-- ambiguous by design: choices are all plausible, the "correct" one is the
-- least-distorted rather than the obvious one, and outcomes acknowledge that
-- even strong choices carry trade-offs.
--
-- Arc: hard -> expert. Correct-answer POSITION varied (§6). XP: correct 20,
-- else 5. Outcome split: result_text = what happened; explanation = biases ->
-- mechanism -> counter -> transfer (§7). Most scenarios offer two *different*
-- biased traps plus the least-distorted choice, so there is no obvious answer.
--
-- Reflection prompts (by scenario slug):
--   sharp-hiring-gut          : When did an early certainty make you gather only the evidence that confirmed it?
--   sharp-market-streak       : When did a recent run of wins feel like skill rather than luck or timing?
--   sharp-rehire-reputation   : Who are you still judging by an early impression the record has since overturned?
--   sharp-postmortem-blame    : When did a bad outcome make a decision look "obviously" wrong that wasn''t at the time?
--   sharp-negotiation-standoff: When did an opening number and time already spent push you past your real limit?
--   sharp-treatment-choice    : When did a vivid story or a survival-vs-risk framing crowd out the actual data?
--   sharp-failing-venture     : What are you continuing mostly to avoid admitting a loss and reading hope into the signs?
--   sharp-market-crash-exit   : When did fresh, vivid bad news tempt you to abandon a sound long-term plan?
--   sharp-team-conflict       : When did you blame someone''s character, excuse your own, and replay only the proof?
--   sharp-vendor-loyalty      : What are you sticking with out of past investment and an old belief it''s "the reliable choice"?
--   sharp-forecast-review     : After a miss, do you blame the unforeseeable, call it obvious, and stay just as confident?
--   sharp-final-call          : On your own proposal, how do you separate what''s true from what you want to be true?
--
-- Idempotency: `sharp-` slug prefix (unique to this pack). Re-run deletes and
-- re-inserts this pack''s children; scenarios upsert on slug. Safe pre-launch.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. scenarios — 12 rows. category_id = the PRIMARY bias''s family, by slug.
-- ----------------------------------------------------------------------------
insert into public.scenarios
  (slug, title, context, stakes, difficulty, category_id, source, status, version)
values
  (
    'sharp-hiring-gut',
    'You Just Know',
    'Ten minutes in, you''re sure she''s the one — she reminds you of your best-ever hire. For the rest of the hour you lob softballs that let her shine and quietly discount a vague answer on the exact skill this role needs most. Two candidates you haven''t warmed to have stronger track records on paper.',
    'A hire you''ll manage for years, riding on a ten-minute feeling.',
    'hard',
    (select id from public.categories where slug = 'certainty-prediction'),
    'authored', 'published', 1
  ),
  (
    'sharp-market-streak',
    'Four in a Row',
    'Your last four trades all paid off, and it feels like you''ve cracked it. You''re ready to bet a much bigger sum on the fifth, sure the streak reflects skill. Somewhere you know four wins is a tiny sample and a rising market lifted everything — but the recent run is loud, and the older, humbler months are quiet in memory.',
    'A much larger stake, wagered on a streak that may be mostly luck.',
    'hard',
    (select id from public.categories where slug = 'memory-availability'),
    'authored', 'published', 1
  ),
  (
    'sharp-rehire-reputation',
    'A Rocky First Quarter',
    'An analyst on your team had a rocky first quarter a year ago, and "not quite up to it" lodged in your mind. Since then she''s quietly become one of your most reliable performers — yet you still read her work warily and clock the rare slip more than the steady wins. A senior role is opening, and you''re deciding who to put forward.',
    'A deserving promotion, weighed against a year-old first impression.',
    'hard',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  ),
  (
    'sharp-postmortem-blame',
    'Anyone Could Have Seen It',
    'A launch you all approved has flopped. In the postmortem it now feels obvious the market wasn''t ready — "anyone could have seen it." The room drifts toward blaming the product lead for missing it, quietly forgetting that everyone, you included, was confident at the time. You''re asked for your take.',
    'A colleague''s reputation, and whether the team learns the real lesson.',
    'hard',
    (select id from public.categories where slug = 'certainty-prediction'),
    'authored', 'published', 1
  ),
  (
    'sharp-negotiation-standoff',
    'Three Evenings In',
    'You''re buying a used car privately. The seller opened at $12,000; comparable cars go for about $9,000. After three long evenings of back-and-forth he''s at $10,500 and won''t move, and you''ve sunk hours plus a mechanic''s fee into this one. $10,500 feels "close" to his ask, and you''re invested enough to just be done.',
    'Around $1,500, and whether his opening price and your spent hours decide it.',
    'hard',
    (select id from public.categories where slug = 'value-anchoring'),
    'authored', 'published', 1
  ),
  (
    'sharp-treatment-choice',
    'Ninety Percent Survival',
    'A relative faces a choice between two treatments. The doctor notes Treatment A has a "90% survival rate"; meanwhile a forum post about a rare, awful side effect of Treatment B is fresh and vivid in your mind. Treatment B is described by its "10% complication rate" but has better long-term outcomes. Everyone''s looking to you to help decide.',
    'A loved one''s long-term health, against a vivid story and a reassuring frame.',
    'expert',
    (select id from public.categories where slug = 'decision-framing'),
    'authored', 'published', 1
  ),
  (
    'sharp-failing-venture',
    'One More Push',
    'Your side business has burned two years and most of your savings. The numbers are bleak, and you keep reading the market signals in the most hopeful light. Shutting down means accepting the loss and the story that you "failed." A friend gently asks if it''s time to stop. One more push might turn it around — or dig the hole deeper.',
    'The rest of your savings, and the story you tell about the last two years.',
    'expert',
    (select id from public.categories where slug = 'value-anchoring'),
    'authored', 'published', 1
  ),
  (
    'sharp-market-crash-exit',
    'Wall-to-Wall Crash',
    'Markets just dropped hard, and the news is wall-to-wall crash coverage — vivid, recent, everywhere. Your long-term retirement fund is down on paper, and every instinct screams to sell before it gets worse. Your plan was always to hold for twenty years through exactly these dips. Selling stops the bleeding you keep reading about, but locks in the loss.',
    'Decades of compounding, against the urge to act on this week''s headlines.',
    'expert',
    (select id from public.categories where slug = 'memory-availability'),
    'authored', 'published', 1
  ),
  (
    'sharp-team-conflict',
    'His Side, Your Side',
    'A project with a peer went badly, and you two clashed. In your telling he was rigid and territorial, while your own pushiness was "just caring about quality." You''ve been replaying the moments that prove he was the problem. Your manager asks each of you, separately, what happened — and you want to be honest, not merely persuasive.',
    'A working relationship and your own growth, against the comfortable version.',
    'expert',
    (select id from public.categories where slug = 'self-social'),
    'authored', 'published', 1
  ),
  (
    'sharp-vendor-loyalty',
    'The Reliable Choice',
    'You championed a vendor three years ago — you fought to bring them in, and you still think of them as "the reliable choice." Lately their service has slipped badly, and a competitor is clearly better and cheaper. Switching means migration pain, admitting your original call has aged poorly, and losing the setup you invested in. Renewal is due.',
    'Years of better, cheaper service, against pride and a costly migration.',
    'expert',
    (select id from public.categories where slug = 'value-anchoring'),
    'authored', 'published', 1
  ),
  (
    'sharp-forecast-review',
    'Off by Thirty Percent',
    'Your confident revenue forecast missed by 30%. Reviewing it, part of you wants to blame an unforeseeable market shift, not your model — while another part now feels the shortfall was "obvious" all along. You also have to set next quarter''s forecast, and the same confidence that burned you is quietly whispering again.',
    'Next quarter''s plan, and whether you actually learn from this one.',
    'expert',
    (select id from public.categories where slug = 'certainty-prediction'),
    'authored', 'published', 1
  ),
  (
    'sharp-final-call',
    'Your Own Proposal',
    'You''re deciding whether to greenlight a bold strategy you personally proposed. The data is genuinely mixed. You notice you''ve been foregrounding the supportive numbers, you feel sure it''ll work, and the deck frames the upside vividly while burying the risks in a footnote. The board will likely follow your recommendation. There''s no clean answer here.',
    'A company-shaping bet, judged by the person most attached to it.',
    'expert',
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
  where scenario_id in (select id from public.scenarios where slug like 'sharp-%');
delete from public.scenario_biases
  where scenario_id in (select id from public.scenarios where slug like 'sharp-%');
delete from public.scenario_choices
  where scenario_id in (select id from public.scenarios where slug like 'sharp-%');

-- ----------------------------------------------------------------------------
-- 3. scenario_choices — 3 per scenario. Most offer two DIFFERENT biased traps
--    plus the least-distorted choice, so no answer is obvious.
-- ----------------------------------------------------------------------------
insert into public.scenario_choices (scenario_id, label, body, is_trap, bias_id, sort_order)
select sc.id, v.label, null, v.is_trap, b.id, v.sort_order
from (values
  -- 1 · sharp-hiring-gut (overconfidence + confirmation) — correct @ 3
  ('sharp-hiring-gut', 1, 'Trust your read — you know a great hire when you see one. Make the offer.', true,  'overconfidence-effect'),
  ('sharp-hiring-gut', 2, 'She confirmed your instinct all hour; you have all the evidence you need.', true,  'confirmation-bias'),
  ('sharp-hiring-gut', 3, 'Probe hard on the weak skill and compare her fairly against the stronger-on-paper candidates.', false, null),
  -- 2 · sharp-market-streak (recency + overconfidence) — correct @ 1
  ('sharp-market-streak', 1, 'Size the bet as if the streak proves little — four recent wins isn''t skill, and the market did some of the work.', false, null),
  ('sharp-market-streak', 2, 'Go big — the recent results are the most relevant signal you have.', true,  'recency-bias'),
  ('sharp-market-streak', 3, 'Trust your edge; you''ve clearly figured this out.', true,  'overconfidence-effect'),
  -- 3 · sharp-rehire-reputation (belief-perseverance + confirmation) — correct @ 2
  ('sharp-rehire-reputation', 1, 'Pass her over — that first quarter showed what she''s really capable of.', true,  'belief-perseverance'),
  ('sharp-rehire-reputation', 2, 'Judge her on the last year''s consistent record, not a year-old first impression.', false, null),
  ('sharp-rehire-reputation', 3, 'Keep watching for more slips to be sure before you promote her.', true,  'confirmation-bias'),
  -- 4 · sharp-postmortem-blame (hindsight + FAE) — correct @ 1
  ('sharp-postmortem-blame', 1, 'Note it wasn''t obvious then; judge the call by what was knowable, and examine the process everyone shared.', false, null),
  ('sharp-postmortem-blame', 2, 'Agree the failure was predictable — the signs were all there.', true,  'hindsight-bias'),
  ('sharp-postmortem-blame', 3, 'Fault the product lead; a sharper leader would have caught it.', true,  'fundamental-attribution-error'),
  -- 5 · sharp-negotiation-standoff (anchoring + sunk cost) — correct @ 3
  ('sharp-negotiation-standoff', 1, 'Meet near $10,500 — it''s well below his $12,000 ask.', true,  'anchoring'),
  ('sharp-negotiation-standoff', 2, 'Just close it; you''ve put too much time and money in to walk away now.', true,  'sunk-cost-fallacy'),
  ('sharp-negotiation-standoff', 3, 'Anchor to the ~$9,000 the car is worth, and be ready to walk despite the hours spent.', false, null),
  -- 6 · sharp-treatment-choice (framing + loss-aversion + availability) — correct @ 2
  ('sharp-treatment-choice', 1, 'Push for A — that side-effect story about B is too frightening to risk.', true,  'availability-heuristic'),
  ('sharp-treatment-choice', 2, 'Set the vivid story and the wording aside; compare A and B on the actual long-term data with the doctor.', false, null),
  ('sharp-treatment-choice', 3, 'Choose A — a 90% survival rate just feels safer than B''s 10% complications.', true,  'framing-effect'),
  -- 7 · sharp-failing-venture (sunk cost + loss-aversion + confirmation) — correct @ 1
  ('sharp-failing-venture', 1, 'Assess it as a stranger would from today — ignore the two years — and decide on the forward numbers.', false, null),
  ('sharp-failing-venture', 2, 'Push on; walking now would waste two years and mean admitting failure.', true,  'sunk-cost-fallacy'),
  ('sharp-failing-venture', 3, 'Trust the hopeful signals you keep seeing; the turnaround is coming.', true,  'confirmation-bias'),
  -- 8 · sharp-market-crash-exit (availability + recency + loss-aversion) — correct @ 3
  ('sharp-market-crash-exit', 1, 'Sell — the crash coverage makes clear this could fall much further.', true,  'availability-heuristic'),
  ('sharp-market-crash-exit', 2, 'Sell to stop the loss growing; you can''t stomach watching it drop more.', true,  'loss-aversion'),
  ('sharp-market-crash-exit', 3, 'Hold to the twenty-year plan; the vivid coverage and paper loss don''t change the long-run case.', false, null),
  -- 9 · sharp-team-conflict (FAE + self-serving + confirmation) — correct @ 2
  ('sharp-team-conflict', 1, 'Lay out how his rigid, territorial character derailed it; you did your part right.', true,  'self-serving-bias'),
  ('sharp-team-conflict', 2, 'Own your share honestly, and weigh the situation and pressures that shaped his behaviour too.', false, null),
  ('sharp-team-conflict', 3, 'Recount the moments you''ve been replaying that clearly show he was at fault.', true,  'confirmation-bias'),
  -- 10 · sharp-vendor-loyalty (sunk cost + belief-perseverance + anchoring) — correct @ 1
  ('sharp-vendor-loyalty', 1, 'Evaluate both vendors on today''s service and price; your past advocacy and setup are already sunk.', false, null),
  ('sharp-vendor-loyalty', 2, 'Renew — you''ve invested too much setup and reputation to switch now.', true,  'sunk-cost-fallacy'),
  ('sharp-vendor-loyalty', 3, 'Stick with them; they''ve always been the reliable choice.', true,  'belief-perseverance'),
  -- 11 · sharp-forecast-review (overconfidence + hindsight + self-serving) — correct @ 3
  ('sharp-forecast-review', 1, 'Blame the unforeseeable shift, and set the next forecast with the same confident method.', true,  'self-serving-bias'),
  ('sharp-forecast-review', 2, 'Trust your refined judgment and commit to another precise, confident number.', true,  'overconfidence-effect'),
  ('sharp-forecast-review', 3, 'Examine honestly what your model missed, and set next quarter as a range with real uncertainty built in.', false, null),
  -- 12 · sharp-final-call (confirmation + overconfidence + framing) — correct @ 2
  ('sharp-final-call', 1, 'Recommend greenlight — the evidence you''ve gathered supports it, and you''re confident.', true,  'confirmation-bias'),
  ('sharp-final-call', 2, 'Pause: bring in a genuine devil''s advocate, surface the buried risks, and decide on the full mixed picture.', false, null),
  ('sharp-final-call', 3, 'Present the vivid upside deck and let the strong story carry the room.', true,  'framing-effect')
) as v(scenario_slug, sort_order, label, is_trap, bias_slug)
join public.scenarios sc on sc.slug = v.scenario_slug
left join public.biases b on b.slug = v.bias_slug;

-- ----------------------------------------------------------------------------
-- 4. outcomes — one per choice. Joined by (scenario_slug, sort_order).
--    Expert outcomes name the interacting biases and acknowledge trade-offs.
-- ----------------------------------------------------------------------------
insert into public.outcomes (choice_id, result_text, explanation, is_correct, xp_reward)
select c.id, v.result_text, v.explanation, v.is_correct, v.xp_reward
from (values
  -- 1 · sharp-hiring-gut
  ('sharp-hiring-gut', 1,
    'You hire on instinct; months in, the exact skill gap you waved past becomes the problem.',
    'That''s the overconfidence effect, and it fired early — "I know a great hire" felt like knowledge before any real testing. The gut carries genuine signal, but it''s least reliable precisely when it feels most certain, and here it arrived in ten minutes on a resemblance to a past hire. Test your strongest impressions hardest; the more sure you feel, the more you owe the doubt a fair hearing.',
    false, 5),
  ('sharp-hiring-gut', 2,
    'You make the offer, mistaking a warm, softball hour for proof.',
    'That''s confirmation bias reinforcing an early certainty. Once you''d decided, you asked questions that let her shine and discounted the weak answer — an interview engineered to confirm, not to test. Feeling certain and finding support are not the same as being right. Structure the interview to probe the doubt and compare candidates on the same hard questions, so the process can actually disconfirm you.',
    false, 5),
  ('sharp-hiring-gut', 3,
    'You probe the gap and run a fair comparison; whoever you choose, it''s on evidence, not a hunch dressed up.',
    'Well done — you disarmed two reinforcing traps: overconfidence (a ten-minute certainty) and confirmation bias (an hour spent confirming it). The trade-off is real: gut impressions do carry information, and structured probing costs you the comfortable "I just know." But certainty that survives hard, disconfirming questions is worth far more than certainty that was never tested. Make your strongest impressions earn their keep.',
    true, 20),
  -- 2 · sharp-market-streak
  ('sharp-market-streak', 1,
    'You keep the bet modest; the streak later breaks, and you''re glad it wasn''t your rent.',
    'Well judged — you resisted two reinforcing biases. Recency bias made four fresh wins feel like the whole story while the humbler months went quiet, and overconfidence turned a small, lucky sample into "skill." The honest read: four wins in a rising market is mostly noise and tailwind. The trade-off is you might forgo a gain if the streak was real — but sizing to the actual evidence, not the recent glow, is how you survive to find out.',
    true, 20),
  ('sharp-market-streak', 2,
    'You bet big on the recent run; the market turns, and the fifth trade gives back much of the four.',
    'That''s recency bias, amplified by overconfidence. The last four results dominated your judgment because they''re vivid and fresh, drowning out the base rate and the older, mixed record. Recent data feels most relevant, but a tiny sample in a rising market is not an edge. Weigh the full history, discount for luck and tailwind, and size bets to what the long run — not the last month — actually supports.',
    false, 5),
  ('sharp-market-streak', 3,
    'You go all-in on "your edge"; the reversal is expensive, and the skill you were sure of doesn''t show up.',
    'That''s the overconfidence effect leaning on recency bias. Four recent wins created a feeling of mastery that the evidence can''t support — confidence and skill are only loosely linked, and a rising market did much of the work. The counter is humbling but simple: separate luck and timing from skill, demand a larger sample before trusting an "edge," and never let a hot streak set your position size.',
    false, 5),
  -- 3 · sharp-rehire-reputation
  ('sharp-rehire-reputation', 1,
    'You pass her over; a year of strong work counts for less, in your mind, than one rough quarter.',
    'That''s belief perseverance. "Not quite up to it" formed early and has outlived the evidence — a year of reliability — because a first impression clings on its own momentum. It''s quietly reinforced by noticing her rare slips more than her steady wins. When someone''s record has clearly changed, the record is the truth, not the old label. Judge the recent, consistent body of work, or you''ll keep punishing people for who they used to be.',
    false, 5),
  ('sharp-rehire-reputation', 2,
    'You put her forward on her real record; she steps up, and you nearly missed her over an old impression.',
    'Well done. You overrode belief perseverance — a stale first impression surviving a year of contrary evidence — rather than letting it quietly veto her. The trade-off is that first impressions aren''t worthless; early struggles can matter. But a sustained, recent record outweighs one rocky quarter, and the honest move is to weight the pattern, not the memory. Let consistent evidence update the verdict.',
    true, 20),
  ('sharp-rehire-reputation', 3,
    'You wait for "more proof"; the delay reads as a snub, and a strong performer starts looking elsewhere.',
    'Demanding more proof sounds prudent but is confirmation bias serving belief perseverance — you''re watching for slips that fit the old "not up to it" label while a year of evidence already answers the question. The bar you''re holding her to isn''t applied to others. At some point accumulated performance should simply settle it; endlessly gathering confirmation of a doubt the record has closed just costs you the person.',
    false, 5),
  -- 4 · sharp-postmortem-blame
  ('sharp-postmortem-blame', 1,
    'You reframe the room: it wasn''t obvious then, and the shared process — not one person — is where the lesson lives.',
    'Well done. You named two reinforcing traps: hindsight bias ("anyone could have seen it," once we know it failed) and the fundamental attribution error (pinning a shared, approved decision on the lead''s character). Knowing the outcome makes the path feel inevitable and invites a scapegoat. Judging by what was knowable at the time, and fixing the process, is how teams actually learn. The trade-off: it''s less satisfying than blame, but far more useful.',
    true, 20),
  ('sharp-postmortem-blame', 2,
    'You agree it was predictable; the team "learns" a lesson that only exists because you now know the ending.',
    'That''s hindsight bias. The failure makes the warning signs feel obvious, but at decision time they were genuinely ambiguous — everyone, including you, was confident. Rewriting the past as predictable corrupts the lesson and sets up unfair blame. Ask what was actually knowable then, not what''s clear now. Otherwise the postmortem teaches a story about the outcome, not the decision that produced it.',
    false, 5),
  ('sharp-postmortem-blame', 3,
    'You fault the lead; morale drops, the real process gaps go unfixed, and the next launch is just as exposed.',
    'That''s the fundamental attribution error, powered by hindsight. A decision the whole room approved gets reattributed to one person''s character ("a sharper leader would''ve caught it") — now that the outcome makes the miss feel obvious. Blaming character ignores the shared situation and the information everyone lacked. Fix the process that let a confident group be wrong together; scapegoating feels decisive but leaves the actual weakness in place.',
    false, 5),
  -- 5 · sharp-negotiation-standoff
  ('sharp-negotiation-standoff', 1,
    'You settle near $10,500, satisfied it''s "well below asking" — and roughly $1,500 above the car''s value.',
    'That''s anchoring. His $12,000 opener set the reference point, so $10,500 felt like a win when the real benchmark is the ~$9,000 comparable cars fetch. The opening number, not the market, framed your sense of a deal. Anchor to independent value before you negotiate, and measure any offer against that — not against where the other side started. What they ask is a tactic; what it''s worth is the fact.',
    false, 5),
  ('sharp-negotiation-standoff', 2,
    'You close it to be done; the spent evenings and mechanic''s fee talk you into overpaying by about $1,500.',
    'That''s the sunk cost fallacy. The hours and the fee are gone whether you buy or walk, yet "I''ve invested too much to quit" pushed you to overpay at $10,500. Past effort is not a reason to accept a bad price now — the only question is whether this deal, from here, beats your alternatives. Be willing to walk from a negotiation you''ve sunk time into; the invested hours are the trap, not the justification.',
    false, 5),
  ('sharp-negotiation-standoff', 3,
    'You hold near $9,000 and stay ready to walk; he either meets you or you find another car at fair value.',
    'Well played — you beat two reinforcing traps. Anchoring wanted you to measure against his $12,000 opener; the sunk cost of three evenings wanted you to "just finish." You anchored to real value (~$9,000) and kept your willingness to walk, which is the source of negotiating power. The trade-off is you might lose this specific car — but at a fair price you''ll find another, and a deal you can walk from is one you control.',
    true, 20),
  -- 6 · sharp-treatment-choice
  ('sharp-treatment-choice', 1,
    'You steer everyone toward A, driven by a forum horror story about B — over B''s better long-term odds.',
    'That''s the availability heuristic — one vivid, recent post about a rare side effect looming larger than the aggregate data, because it''s so easy to picture. It rode in alongside a reassuring "90% survival" frame. A single dramatic anecdote isn''t a rate. Take the fear seriously but size it against the actual complication frequency and long-term outcomes, with the doctor. The most memorable story is rarely the most likely one.',
    false, 5),
  ('sharp-treatment-choice', 2,
    'You set the story and the wording aside and work through the real outcome data with the doctor.',
    'Exactly right, and genuinely hard under this much pressure. You disarmed three interacting biases: availability (a vivid side-effect story), framing ("90% survival" vs "10% complication" for the same kind of trade-off), and loss aversion (over-weighting a dramatic possible loss). The trade-off is that data feels cold beside a frightening anecdote and a comforting number — but a loved one''s long-term health deserves the actual odds, not the most memorable or best-worded version of them.',
    true, 20),
  ('sharp-treatment-choice', 3,
    'You pick A because "90% survival" feels safer, letting the framing choose over the long-term outcomes.',
    'That''s the framing effect, with loss aversion underneath. "90% survival" is worded as a gain and soothes, while B''s "10% complication rate" is worded as a loss and alarms — even though B has better long-term outcomes. The wording, not the medicine, is steering you. Restate both options in the same frame (survival and complication rates side by side) and decide on the outcomes that matter over time, with the doctor, not on which phrasing feels safest.',
    false, 5),
  -- 7 · sharp-failing-venture
  ('sharp-failing-venture', 1,
    'You judge it fresh from today''s numbers; whether you continue or close, it''s a clear-eyed call, not a flinch.',
    'Well done — this is the hardest kind of honesty. You cut through the sunk cost of two years and savings, the loss aversion that makes "admitting failure" feel unbearable, and the confirmation bias reading every signal hopefully. "Would I start this today, on these numbers?" ignores history and judges the future. The trade-off: sometimes persistence does pay, and quitting stings. But the past can''t be recovered — only the next dollar and month are yours to decide.',
    true, 20),
  ('sharp-failing-venture', 2,
    'You push on to honour the two years; the hole deepens, and the loss you feared grows larger.',
    'That''s the sunk cost fallacy, held in place by loss aversion. The two years and savings are gone whatever you choose, but "I''d be wasting it, and admitting I failed" made continuing feel like the only way to avoid a loss — so you risked more to dodge accepting what''s already spent. The rational question is purely forward: do the numbers from here justify more? "I''ve come too far" is the sentence that funds many a deeper hole.',
    false, 5),
  ('sharp-failing-venture', 3,
    'You bet on the hopeful signals you''ve been curating; the turnaround stays around the corner.',
    'That''s confirmation bias feeding a sunk cost. Desperate not to accept the loss, you''ve been reading ambiguous market signals in the most favourable light and filtering out the bleak ones — manufacturing evidence for the decision you already need to be true. Seek the disconfirming data hardest when you most want the hopeful story. Judge the venture on its honest forward numbers, not on the encouraging signs you went looking for.',
    false, 5),
  -- 8 · sharp-market-crash-exit
  ('sharp-market-crash-exit', 1,
    'You sell into the panic; the coverage was loudest near the bottom, and you lock in the loss before the recovery.',
    'That''s the availability heuristic and recency bias together. Wall-to-wall, vivid, fresh crash coverage made "it''ll fall much further" feel obvious, because catastrophe is easy to picture when it''s everywhere on your screen. But dramatic, recent news isn''t a forecast. For a twenty-year plan, this week''s headlines are noise. Decide from the long-run case and your original plan, not from the volume and vividness of the current fear.',
    false, 5),
  ('sharp-market-crash-exit', 2,
    'You sell to stop the pain; the relief is instant, and the permanent loss is the price of it.',
    'That''s loss aversion, sharpened by the recent, vivid coverage. Watching the paper loss grow hurt more than the long-run math justified, so selling felt like safety — but it converts a temporary paper dip into a realized loss and abandons a plan built for exactly these drops. A falling number you can ride out is not the same as money gone. Separate the discomfort from the decision; the plan already anticipated this.',
    false, 5),
  ('sharp-market-crash-exit', 3,
    'You hold to the plan; the discomfort is real, but so is the recovery you''d have sold out of.',
    'Well done — and it takes nerve. You resisted availability and recency (vivid, fresh crash news posing as a forecast) and loss aversion (the urge to stop a paper loss growing). A twenty-year plan is designed to withstand precisely these weeks. The honest trade-off: nobody can rule out a further fall, and holding feels awful in the moment. But acting on headline-driven fear, against a sound long-term plan, is how good investors turn a dip into a loss.',
    true, 20),
  -- 9 · sharp-team-conflict
  ('sharp-team-conflict', 1,
    'You give the manager the clean version — his character, your virtue — and it rings a little too tidy.',
    'That''s the fundamental attribution error and self-serving bias at once: his behaviour is "rigid, territorial" (character), while yours is "caring about quality" (noble circumstance). The same act gets opposite explanations depending on whose it is. Managers usually hear both sides, and the tidy story rarely survives. Own your contribution and grant him the situational reading you gave yourself; it''s both fairer and more credible.',
    false, 5),
  ('sharp-team-conflict', 2,
    'You tell it honestly — your part included — and the account holds up when both versions are compared.',
    'Well done — the hard, honest path. You overrode the self-serving asymmetry (his fault is character, yours is virtue), the fundamental attribution error (ignoring the pressures shaping his behaviour), and the confirmation bias of replaying only the moments that indict him. The trade-off is it costs you the flattering story and some ego. But owning your share is what actually repairs the relationship and grows you — and it''s the version that survives scrutiny.',
    true, 20),
  ('sharp-team-conflict', 3,
    'You recite the curated highlight reel of his failings; it convinces you more than it convinces your manager.',
    'That''s confirmation bias serving a self-serving story. You''ve been replaying the moments that prove he was the problem and skipping the ones that implicate you — assembling a case, not recalling events. Memory curated to win isn''t honesty. Deliberately surface the moments that don''t fit your version, and weigh the situation he was under. The goal your manager can tell apart is being accurate, not being persuasive.',
    false, 5),
  -- 10 · sharp-vendor-loyalty
  ('sharp-vendor-loyalty', 1,
    'You compare both on today''s reality; if the competitor wins, you switch despite the pain and the pride.',
    'Well done — you cut through three reinforcing traps. The sunk cost of your setup and advocacy, belief perseverance ("the reliable choice" they used to be), and anchoring to your original call all pushed toward renewing. Judging both vendors on current service and price is the only forward-looking question. The trade-off is genuine — migration hurts and admitting an aged call stings — but loyalty to a past decision is not a reason to keep buying worse, dearer service.',
    true, 20),
  ('sharp-vendor-loyalty', 2,
    'You renew to protect your investment; the poor service continues, now on your explicit say-so.',
    'That''s the sunk cost fallacy. The setup effort and the reputation you staked are gone whether you renew or switch — they can''t justify paying more for worse service now. "Too invested to switch" keeps organisations married to failing vendors, tools, and strategies. The only live question is which option serves you best going forward. Renewing to honour past investment just adds this year''s cost to a loss you''ve already taken.',
    false, 5),
  ('sharp-vendor-loyalty', 3,
    'You stick with them on reputation; "the reliable choice" describes who they were, not who they''ve become.',
    'That''s belief perseverance, propped up by anchoring to your original judgment. "They''ve always been reliable" was true once and now survives clear evidence of slipping service, because the belief runs on its own momentum. Their past reputation isn''t their current performance. Re-evaluate on what they deliver today versus a better, cheaper competitor; a label earned three years ago shouldn''t auto-renew a contract that no longer earns it.',
    false, 5),
  -- 11 · sharp-forecast-review
  ('sharp-forecast-review', 1,
    'You blame the market and keep your method; next quarter the same overconfident model misses again.',
    'That''s self-serving bias, with a twist of hindsight. The miss gets pinned on an "unforeseeable" shift (outside you), protecting the model — even as part of you now calls the shortfall "obvious." You can''t have it both ways, and neither story fixes anything. Own what the model actually missed and why, and rebuild it; explaining failure away by external luck, while keeping the confident method, guarantees the repeat.',
    false, 5),
  ('sharp-forecast-review', 2,
    'You commit to another precise, confident number; the false precision sets you up to miss a third time.',
    'That''s the overconfidence effect, unchastened by the last miss. A 30% error is loud evidence your certainty outruns your accuracy, yet the pull is to produce another crisp, confident figure. Precise single-point forecasts feel authoritative and mislead everyone who plans on them. Express forecasts as ranges that reflect real uncertainty, and let a track record of misses widen them. Confidence that ignores its own errors isn''t judgment; it''s the setup for the next one.',
    false, 5),
  ('sharp-forecast-review', 3,
    'You dissect the miss honestly and forecast next quarter as a range; it''s less impressive, and far more useful.',
    'Well done — you resisted three interacting traps: self-serving bias (blaming the unforeseeable), hindsight bias (calling the miss "obvious" after the fact), and the overconfidence effect (another precise number). Studying what the model genuinely missed, and pricing in uncertainty as a range, is how forecasts actually improve. The trade-off: a range looks less commanding than a bold figure. But a forecast that admits what it can''t know is the one worth planning around.',
    true, 20),
  -- 12 · sharp-final-call
  ('sharp-final-call', 1,
    'You greenlight it on "the evidence," having quietly built the evidence to fit the answer you wanted.',
    'That''s confirmation bias, fused with overconfidence — on your own proposal, the most dangerous place for both. You foregrounded the supportive numbers, and the feeling of certainty stood in for a genuine test, on data that''s actually mixed. Being the author makes you least able to see the flaws. Before committing a company-shaping bet, deliberately seek the strongest case against it; if it only holds up when you''re the one assembling the evidence, it doesn''t hold up.',
    false, 5),
  ('sharp-final-call', 2,
    'You bring in a real challenger, force the buried risks into the open, and decide on the whole messy picture.',
    'Exactly right — the mark of a sharp thinker under uncertainty. You countered confirmation bias (favouring your own supportive data), overconfidence (the unearned feeling of "it''ll work"), and framing (a deck that inflates upside and buries risk), all on a proposal you''re attached to. A genuine devil''s advocate is the antidote to being your own worst reviewer. The trade-off: the honest, mixed picture may weaken your bold pitch — but a decision that survives real challenge is the only kind worth the board''s trust.',
    true, 20),
  ('sharp-final-call', 3,
    'You let the vivid upside deck carry the room; the story wins the vote, and the footnoted risks arrive later, unbudgeted.',
    'That''s the framing effect, weaponising your own confirmation bias and overconfidence. A deck that dramatizes the upside and buries the risks in a footnote persuades by presentation, not substance — and because you believe it, you deploy it without flinching. Winning the room isn''t the same as being right. Present the risks as prominently as the upside, invite challenge, and decide on the balanced picture; a strong story is exactly how mixed evidence gets waved through.',
    false, 5)
) as v(scenario_slug, sort_order, result_text, explanation, is_correct, xp_reward)
join public.scenarios sc on sc.slug = v.scenario_slug
join public.scenario_choices c on c.scenario_id = sc.id and c.sort_order = v.sort_order;

-- ----------------------------------------------------------------------------
-- 5. scenario_biases — every scenario combines 2-3 biases (capstone).
--    Across the pack, all 12 MVP biases are exercised.
-- ----------------------------------------------------------------------------
insert into public.scenario_biases (scenario_id, bias_id)
select sc.id, b.id
from (values
  ('sharp-hiring-gut',           'overconfidence-effect'),
  ('sharp-hiring-gut',           'confirmation-bias'),
  ('sharp-market-streak',        'recency-bias'),
  ('sharp-market-streak',        'overconfidence-effect'),
  ('sharp-rehire-reputation',    'belief-perseverance'),
  ('sharp-rehire-reputation',    'confirmation-bias'),
  ('sharp-postmortem-blame',     'hindsight-bias'),
  ('sharp-postmortem-blame',     'fundamental-attribution-error'),
  ('sharp-negotiation-standoff', 'anchoring'),
  ('sharp-negotiation-standoff', 'sunk-cost-fallacy'),
  ('sharp-treatment-choice',     'framing-effect'),
  ('sharp-treatment-choice',     'loss-aversion'),
  ('sharp-treatment-choice',     'availability-heuristic'),
  ('sharp-failing-venture',      'sunk-cost-fallacy'),
  ('sharp-failing-venture',      'loss-aversion'),
  ('sharp-failing-venture',      'confirmation-bias'),
  ('sharp-market-crash-exit',    'availability-heuristic'),
  ('sharp-market-crash-exit',    'recency-bias'),
  ('sharp-market-crash-exit',    'loss-aversion'),
  ('sharp-team-conflict',        'fundamental-attribution-error'),
  ('sharp-team-conflict',        'self-serving-bias'),
  ('sharp-team-conflict',        'confirmation-bias'),
  ('sharp-vendor-loyalty',       'sunk-cost-fallacy'),
  ('sharp-vendor-loyalty',       'belief-perseverance'),
  ('sharp-vendor-loyalty',       'anchoring'),
  ('sharp-forecast-review',      'overconfidence-effect'),
  ('sharp-forecast-review',      'hindsight-bias'),
  ('sharp-forecast-review',      'self-serving-bias'),
  ('sharp-final-call',           'confirmation-bias'),
  ('sharp-final-call',           'overconfidence-effect'),
  ('sharp-final-call',           'framing-effect')
) as v(scenario_slug, bias_slug)
join public.scenarios sc on sc.slug = v.scenario_slug
join public.biases b on b.slug = v.bias_slug;

-- ----------------------------------------------------------------------------
-- 6. scenario_pack_items — order within Sharp Thinking (hard -> expert).
-- ----------------------------------------------------------------------------
insert into public.scenario_pack_items (pack_id, scenario_id, sort_order)
select p.id, sc.id, v.sort_order
from (values
  ('sharp-hiring-gut',           1),
  ('sharp-market-streak',        2),
  ('sharp-rehire-reputation',    3),
  ('sharp-postmortem-blame',     4),
  ('sharp-negotiation-standoff', 5),
  ('sharp-treatment-choice',     6),
  ('sharp-failing-venture',      7),
  ('sharp-market-crash-exit',    8),
  ('sharp-team-conflict',        9),
  ('sharp-vendor-loyalty',       10),
  ('sharp-forecast-review',      11),
  ('sharp-final-call',           12)
) as v(scenario_slug, sort_order)
cross join (select id from public.scenario_packs where slug = 'sharp-thinking') p
join public.scenarios sc on sc.slug = v.scenario_slug;

-- ----------------------------------------------------------------------------
-- 7. Publish the pack — completes the MVP scenario library.
-- ----------------------------------------------------------------------------
update public.scenario_packs
  set is_published = true, updated_at = now()
  where slug = 'sharp-thinking';
