-- ============================================================================
-- MindShift — Phase 5D.3: "At Work" Scenario Library
-- ============================================================================
-- Full playable content for the ONE pack "at-work" (Phase 5C): 12 scenarios,
-- choices, outcomes, bias links, pack items, then publish. Structure/quality
-- mirror the Everyday Traps benchmark (20260723000003).
--
-- Scope — At Work only. No schema changes, no new tables, no RLS/gameplay code.
--
-- Biases taught (the 3 assigned), 4 primary each; one scenario combines the
-- self/other mirror (ContentStrategy §2, §3):
--   fundamental-attribution-error (family: self-social)
--   self-serving-bias             (family: self-social)
--   overconfidence-effect         (family: certainty-prediction)
--
-- Arc: medium, growing subtler; the two subtlest (a leader''s blame, a launch
-- plan) are `hard`. Correct-answer POSITION varied (§6). XP: correct 20, else 5.
-- Outcome split: result_text = what happened; explanation = bias -> mechanism
-- -> counter -> transfer (§7). Correct outcomes still teach.
--
-- Reflection prompts (by scenario slug):
--   work-missed-deadline    : When did you judge a colleague''s character for something their situation might explain?
--   work-quiet-newhire      : Have you written someone off early, before their circumstances had a chance to show?
--   work-curt-message       : When did a short or blunt message feel personal — and later turn out not to be?
--   work-employment-gap     : Have you read a gap or oddity on paper as a flaw before hearing the story?
--   work-project-credit     : When did you take credit that a quieter contributor had earned?
--   work-missed-target      : Do you explain your wins and losses by the same standard, or a self-flattering one?
--   work-tough-feedback     : When did you dismiss hard feedback as bias before testing whether it was true?
--   work-team-underperforms : As a lead, when did you blame the team for something your own direction shaped?
--   work-task-estimate      : When did a confident time estimate of yours turn out badly optimistic?
--   work-wing-presentation  : Have you skipped preparing because you felt sure — and paid for it?
--   work-interview-prep     : When did certainty about "clicking" lead you to under-prepare?
--   work-launch-timeline    : Do your plans assume the best case, or how things have actually gone before?
--
-- Idempotency: `work-` slug prefix (unique to this pack). Re-run deletes and
-- re-inserts this pack''s children; scenarios upsert on slug. Safe pre-launch.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. scenarios — 12 rows. category_id = the PRIMARY bias''s family, by slug.
-- ----------------------------------------------------------------------------
insert into public.scenarios
  (slug, title, context, stakes, difficulty, category_id, source, status, version)
values
  (
    'work-missed-deadline',
    'The Report That Didn''t Come',
    'A teammate promised the report by Friday, and it''s not in. Your first thought lands hard: he''s unreliable, doesn''t take deadlines seriously. You don''t know his manager dropped two urgent tasks on him Wednesday, or that his kid was sick. You''re about to respond in the team channel.',
    'A working relationship, and whether one missed date defines a person.',
    'medium',
    (select id from public.categories where slug = 'self-social'),
    'authored', 'published', 1
  ),
  (
    'work-quiet-newhire',
    'The Quiet New Hire',
    'A new hire has been quiet through her first few team meetings. A colleague mutters that she seems "disengaged, maybe not a great fit." She joined two weeks ago and barely knows the product, the people, or when it''s safe to speak. Someone turns to you for your read.',
    'Someone''s reputation, set in her first two weeks.',
    'medium',
    (select id from public.categories where slug = 'self-social'),
    'authored', 'published', 1
  ),
  (
    'work-curt-message',
    'Four Words',
    'You send a careful proposal. The reply comes back: "No, this won''t work." No reasons, no softening. It stings, and you read it as dismissive and rude. You can''t see that she typed it from her phone between calls, mid-way through a production outage.',
    'How you respond next, based on a tone you may have invented.',
    'medium',
    (select id from public.categories where slug = 'self-social'),
    'authored', 'published', 1
  ),
  (
    'work-employment-gap',
    'The Two-Year Gap',
    'You''re interviewing a strong candidate whose résumé shows a two-year gap. Your gut whispers "unreliable — maybe couldn''t hold a job." You have no idea the gap was caregiving for a dying parent, or a deliberate sabbatical. The panel wants your recommendation.',
    'A qualified candidate''s shot, weighed against a story you haven''t heard.',
    'medium',
    (select id from public.categories where slug = 'self-social'),
    'authored', 'published', 1
  ),
  (
    'work-project-credit',
    'The Praise in the Room',
    'A project you led just shipped to real praise. The truth is quieter: a teammate''s late nights rescued it after your first plan stalled. In the wrap-up, leadership is congratulating you by name. It would be easy to accept it and wave vaguely at "the team."',
    'A colleague''s recognition, and what kind of lead you are.',
    'medium',
    (select id from public.categories where slug = 'self-social'),
    'authored', 'published', 1
  ),
  (
    'work-missed-target',
    'Under Target',
    'Your quarter came in well under target. Your mind reaches for reasons: a tough market, a clunky tool, one unlucky account. Last quarter, when you beat target, you credited your own hustle. A peer asks, genuinely, what you think happened.',
    'Whether you learn from this quarter or explain it away.',
    'medium',
    (select id from public.categories where slug = 'self-social'),
    'authored', 'published', 1
  ),
  (
    'work-tough-feedback',
    'She Doesn''t Get My Style',
    'In your review, your manager says your writing is often unclear and slows the team down. It stings. Your first instinct: she doesn''t get your style, and she''s always favored the other analyst anyway. You could dismiss it, or sit with it.',
    'A real chance to improve, or a comfortable reason to ignore it.',
    'medium',
    (select id from public.categories where slug = 'self-social'),
    'authored', 'published', 1
  ),
  (
    'work-team-underperforms',
    'They Just Aren''t Hungry',
    'As team lead, your unit missed its goals. You catch yourself thinking the team simply isn''t hungry enough — while your own vague priorities and mid-quarter pivots feel like reasonable calls made under pressure. The skip-level asks you what went wrong.',
    'Your team''s standing, and whether you see your own hand in the result.',
    'hard',
    (select id from public.categories where slug = 'self-social'),
    'authored', 'published', 1
  ),
  (
    'work-task-estimate',
    'How Long Will It Take?',
    'Your manager asks how long a data migration will take. You''ve done similar work, and it "feels like" two days. But jobs like this have burned you before — edge cases, cleanup, a dependency that broke at the worst time. You''re about to name a number.',
    'A commitment others will plan around, and your credibility if it slips.',
    'medium',
    (select id from public.categories where slug = 'certainty-prediction'),
    'authored', 'published', 1
  ),
  (
    'work-wing-presentation',
    'You Know It Cold',
    'You''re presenting to leadership tomorrow. You know the material cold and figure you''ll wing it — prep feels unnecessary. The last time you felt this sure, you fumbled a key question and lost the room. The evening is free either way.',
    'How you land with leadership, against one free evening.',
    'medium',
    (select id from public.categories where slug = 'certainty-prediction'),
    'authored', 'published', 1
  ),
  (
    'work-interview-prep',
    'You''ll Click With Them',
    'You have an interview at a company you''d love to join. You''re experienced and sure you''ll click with them, so you plan only light prep — no research on their recent product shift, no rehearsing your weak spots. A full evening to prepare sits open.',
    'A job you actually want, against a feeling that you''ve got this.',
    'medium',
    (select id from public.categories where slug = 'certainty-prediction'),
    'authored', 'published', 1
  ),
  (
    'work-launch-timeline',
    'A Bold Date',
    'You''re setting the launch date for a six-week project. The plan assumes everything goes right — no sick days, no surprises, no scope creep. Your last three projects each ran about 40% over for exactly those reasons. Stakeholders want a date now, and a bold one impresses.',
    'A promise the whole company plans around, and what happens when it slips.',
    'hard',
    (select id from public.categories where slug = 'certainty-prediction'),
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
  where scenario_id in (select id from public.scenarios where slug like 'work-%');
delete from public.scenario_biases
  where scenario_id in (select id from public.scenarios where slug like 'work-%');
delete from public.scenario_choices
  where scenario_id in (select id from public.scenarios where slug like 'work-%');

-- ----------------------------------------------------------------------------
-- 3. scenario_choices — 3 per scenario. Trap choices carry the target bias_id.
-- ----------------------------------------------------------------------------
insert into public.scenario_choices (scenario_id, label, body, is_trap, bias_id, sort_order)
select sc.id, v.label, null, v.is_trap, b.id, v.sort_order
from (values
  -- 1 · work-missed-deadline (FAE) — correct @ 2
  ('work-missed-deadline', 1, 'Post a pointed reminder about people "respecting shared deadlines."', true,  'fundamental-attribution-error'),
  ('work-missed-deadline', 2, 'Message him privately first and ask what got in the way.', false, null),
  ('work-missed-deadline', 3, 'Quietly redo the report yourself and say nothing.', false, null),
  -- 2 · work-quiet-newhire (FAE) — correct @ 3
  ('work-quiet-newhire', 1, 'Agree she seems checked out — the quiet ones usually are.', true,  'fundamental-attribution-error'),
  ('work-quiet-newhire', 2, 'Withhold a verdict but keep a wary eye on her output.', false, null),
  ('work-quiet-newhire', 3, 'Note she''s two weeks in, and give her time plus a low-stakes way to contribute.', false, null),
  -- 3 · work-curt-message (FAE) — correct @ 1
  ('work-curt-message', 1, 'Assume nothing about her tone; ask what specifically won''t work, and why.', false, null),
  ('work-curt-message', 2, 'Fire back that there''s no need to be so dismissive.', true,  'fundamental-attribution-error'),
  ('work-curt-message', 3, 'Drop the proposal — clearly she''s not interested.', false, null),
  -- 4 · work-employment-gap (FAE) — correct @ 3
  ('work-employment-gap', 1, 'Flag the gap as a red flag about her commitment.', true,  'fundamental-attribution-error'),
  ('work-employment-gap', 2, 'Rank her lower to be safe, without raising it.', false, null),
  ('work-employment-gap', 3, 'Ask about the gap openly and judge her on the answer and the role''s needs.', false, null),
  -- 5 · work-project-credit (self-serving) — correct @ 2
  ('work-project-credit', 1, 'Accept the praise — you led it — with a general nod to "a great team effort."', true,  'self-serving-bias'),
  ('work-project-credit', 2, 'Name your teammate''s specific contribution directly to leadership.', false, null),
  ('work-project-credit', 3, 'Stay modest and quiet, letting the praise wash over the room.', false, null),
  -- 6 · work-missed-target (self-serving) — correct @ 1
  ('work-missed-target', 1, 'Examine what was in your control this quarter, as readily as you''d claim a win.', false, null),
  ('work-missed-target', 2, 'Chalk it up to the market and bad luck — you did your part.', true,  'self-serving-bias'),
  ('work-missed-target', 3, 'Point to the tool everyone complains about and move on.', false, null),
  -- 7 · work-tough-feedback (self-serving) — correct @ 3
  ('work-tough-feedback', 1, 'Decide it''s her bias — your writing has always been fine.', true,  'self-serving-bias'),
  ('work-tough-feedback', 2, 'Nod along in the room, then quietly ignore it.', false, null),
  ('work-tough-feedback', 3, 'Ask for two recent examples and test the feedback honestly before judging it.', false, null),
  -- 8 · work-team-underperforms (self-serving + FAE) — correct @ 2
  ('work-team-underperforms', 1, 'Tell the skip-level the team lacked drive and ownership this cycle.', true,  'self-serving-bias'),
  ('work-team-underperforms', 2, 'Own how your unclear priorities contributed, then examine team factors together.', false, null),
  ('work-team-underperforms', 3, 'Blame the unrealistic goals handed down from above.', false, null),
  -- 9 · work-task-estimate (overconfidence) — correct @ 1
  ('work-task-estimate', 1, 'Give a buffered range based on how these jobs actually went, not the best case.', false, null),
  ('work-task-estimate', 2, 'Say two days — you know this kind of work.', true,  'overconfidence-effect'),
  ('work-task-estimate', 3, 'Say two days, and privately hope it holds.', false, null),
  -- 10 · work-wing-presentation (overconfidence) — correct @ 3
  ('work-wing-presentation', 1, 'Skip prep — you know this inside out.', true,  'overconfidence-effect'),
  ('work-wing-presentation', 2, 'Skim the slides once and call it done.', false, null),
  ('work-wing-presentation', 3, 'Run it once aloud and prepare for the three hardest questions.', false, null),
  -- 11 · work-interview-prep (overconfidence) — correct @ 2
  ('work-interview-prep', 1, 'Keep prep light — you interview well and you''ll read the room.', true,  'overconfidence-effect'),
  ('work-interview-prep', 2, 'Research their recent moves and rehearse the answers you''re weakest on.', false, null),
  ('work-interview-prep', 3, 'Reread your own résumé and trust the rest to instinct.', false, null),
  -- 12 · work-launch-timeline (overconfidence) — correct @ 1
  ('work-launch-timeline', 1, 'Set the date from how your past projects actually ran, buffer included.', false, null),
  ('work-launch-timeline', 2, 'Commit to six weeks — this time you''ve planned it tightly.', true,  'overconfidence-effect'),
  ('work-launch-timeline', 3, 'Split the difference: promise seven weeks and hope it holds.', false, null)
) as v(scenario_slug, sort_order, label, is_trap, bias_slug)
join public.scenarios sc on sc.slug = v.scenario_slug
left join public.biases b on b.slug = v.bias_slug;

-- ----------------------------------------------------------------------------
-- 4. outcomes — one per choice. Joined by (scenario_slug, sort_order).
-- ----------------------------------------------------------------------------
insert into public.outcomes (choice_id, result_text, explanation, is_correct, xp_reward)
select c.id, v.result_text, v.explanation, v.is_correct, v.xp_reward
from (values
  -- 1 · work-missed-deadline
  ('work-missed-deadline', 1,
    'You post the reminder; he reads it after a brutal week, and the working relationship cools.',
    'That''s the fundamental attribution error. You explained a missed deadline by his character — "unreliable" — while the real cause was situational: dumped-on workload, a sick kid, things you couldn''t see. We do this to others while excusing our own slips by circumstance. Before judging, ask "what situation could explain this?" — the same grace you''d want on your bad week.',
    false, 5),
  ('work-missed-deadline', 2,
    'You ask privately, learn what happened, and sort out the report without burning the relationship.',
    'Well handled. The pull to brand him "unreliable" was the fundamental attribution error — reaching for character and ignoring his situation. By asking first, you let the circumstances surface instead of inventing a flaw. Make it a habit: a single missed commitment is a data point about a moment, rarely about a person.',
    true, 20),
  ('work-missed-deadline', 3,
    'You silently redo it, resentful, and he never learns anything was wrong.',
    'Quietly fixing it still rests on an unspoken verdict — that he can''t be relied on — which is the fundamental attribution error, judging character over situation. It also buries the real cause and breeds resentment. A direct, situation-first question ("what got in the way?") beats both blaming him and silently covering for him.',
    false, 5),
  -- 2 · work-quiet-newhire
  ('work-quiet-newhire', 1,
    'You agree she''s checked out; the label spreads before she''s had a fair chance.',
    'That''s the fundamental attribution error. "Quiet" got read as a character trait — disengaged — when the obvious situation is that she''s two weeks in and still finding her footing. We under-weight others'' circumstances constantly. Picture yourself new in the room: silence is usually caution, not indifference. Judge people once their situation has had time to show.',
    false, 5),
  ('work-quiet-newhire', 2,
    'You reserve judgment but quietly start watching for proof she''s not a fit.',
    'Better than agreeing outright, but "watching for proof" has already leaned toward a character verdict — the fundamental attribution error — and it tends to notice only what confirms it. A new hire''s early quiet is almost always situational. Instead of monitoring for flaws, create a low-pressure way for her to contribute and see who she is when settled.',
    false, 5),
  ('work-quiet-newhire', 3,
    'You give her time and an easy way in; a few weeks later she''s contributing well.',
    'Exactly right. You resisted the fundamental attribution error — reading "quiet" as "disengaged" — and credited the obvious situation: she''s brand new. Naming the circumstance and lowering the stakes let her real ability show. Extend the same benefit of the doubt you''d want in an unfamiliar room; character shows over time, not in week one.',
    true, 20),
  -- 3 · work-curt-message
  ('work-curt-message', 1,
    'You ask what won''t work; she explains between fires, and a real design flaw surfaces.',
    'Well done. The sting made "she''s rude and dismissive" feel obvious — the fundamental attribution error, attributing four clipped words to her personality rather than her situation (an outage, a phone, no time). By asking instead of reacting, you got the substance and kept the peace. Blunt messages usually reflect the sender''s moment, not their opinion of you.',
    true, 20),
  ('work-curt-message', 2,
    'You snap back about her tone; she''s baffled, and now there''s friction over nothing.',
    'That''s the fundamental attribution error. You read a terse, four-word reply as a character statement — dismissive, rude — when the cause was situational: she was firefighting an outage from her phone. We rarely grant others the context we grant ourselves. Assume a benign situation first and ask about the substance; tone over text is mostly in the reader.',
    false, 5),
  ('work-curt-message', 3,
    'You abandon a good proposal, reading her bluntness as a verdict on it.',
    'Dropping it treats "No, this won''t work" as proof of her disdain — the fundamental attribution error, mistaking a stressed, hurried tone for a considered dismissal. You may have killed a sound idea over imagined rudeness. Terse wording reflects the sender''s situation far more than their judgment; ask for the reasons before you fold.',
    false, 5),
  -- 4 · work-employment-gap
  ('work-employment-gap', 1,
    'You flag the gap as a commitment risk; a strong candidate slides down the list for an unheard reason.',
    'That''s the fundamental attribution error. A gap on paper became a character judgment — "unreliable" — with no knowledge of the situation behind it (caregiving, a sabbatical, a tough market). We infer traits from thin evidence while excusing our own gaps by circumstance. Ask about it; judge the person and the role''s needs, not a blank space.',
    false, 5),
  ('work-employment-gap', 2,
    'You quietly rank her lower "to be safe," and never learn what the gap actually was.',
    'Downgrading her silently is the fundamental attribution error made invisible — you''ve assigned a character flaw to a gap whose situation you never asked about. "To be safe" just protects the assumption from being tested. A gap is a fact, not a story; the fair, accurate move is to raise it openly and judge her answer, not the emptiness on the page.',
    false, 5),
  ('work-employment-gap', 3,
    'You ask about the gap; her reason is sound, and you assess her on the actual role.',
    'Exactly right. You refused the fundamental attribution error — turning a résumé gap into "unreliable" — and got the situation before the verdict. Most gaps have ordinary, human explanations that thin paper hides. Asking openly is both fairer and more accurate, and it''s the same courtesy you''d want for the gaps in your own story.',
    true, 20),
  -- 5 · work-project-credit
  ('work-project-credit', 1,
    'You accept the praise with a vague team wave; your teammate''s rescue goes unseen.',
    'That''s self-serving bias — claiming the win as your leadership while the save came from someone else''s late nights. We credit successes to ourselves and blur others'' part, especially when it flatters us. A vague "team effort" is how the bias hides in plain sight. Name specific contributions; borrowed credit costs you trust and costs them recognition they earned.',
    false, 5),
  ('work-project-credit', 2,
    'You name your teammate''s work to leadership; the credit lands where it belongs, and your standing rises.',
    'Well done — you overrode self-serving bias, the instinct to absorb a shared win as personal skill. Naming the real contributor is both honest and, quietly, the mark of a leader people trust. The same bias tempts us to keep credit and shed blame; countering it in the good moments makes owning the hard ones believable.',
    true, 20),
  ('work-project-credit', 3,
    'You stay silent and modest; the room still credits you, and your teammate stays invisible.',
    'Modesty isn''t the fix here. Saying nothing lets the room''s assumption stand — that the win was yours — which is self-serving bias by default: you keep credit you didn''t fully earn without having to claim it aloud. Silence and a vague "team" both erase the person who rescued it. The honest move is active: name their specific contribution.',
    false, 5),
  -- 6 · work-missed-target
  ('work-missed-target', 1,
    'You dig into your own calls this quarter and find two you''d change — real lessons for next time.',
    'Exactly right. You applied one standard to a loss and a win, which defeats self-serving bias — the habit of crediting success to yourself and blaming failure on luck, markets, or tools. Owning the controllable part is where learning lives. Ask of every outcome, good or bad, "what was mine in this?"; that symmetry is how skill compounds.',
    true, 20),
  ('work-missed-target', 2,
    'You settle on "tough market, bad luck," and coast into next quarter unchanged.',
    'That''s self-serving bias. Last quarter''s win was "my hustle"; this quarter''s miss is "the market" — the same person, opposite rules, depending on which flatters you. External factors may be real, but the asymmetry blocks learning: you can''t improve what you never own. Judge wins and losses by the same yardstick, and look hard for the part that was yours.',
    false, 5),
  ('work-missed-target', 3,
    'You blame the clunky tool and move on, having learned nothing you can act on.',
    'The tool might genuinely be clunky, but reaching for it first — while your past wins were "your hustle" — is self-serving bias picking the explanation that protects you. It conveniently sits outside your control. Even if outside factors hurt, ask what was in your hands this quarter, the same way you''d claim a good one. That''s where the improvement is.',
    false, 5),
  -- 7 · work-tough-feedback
  ('work-tough-feedback', 1,
    'You decide it''s her bias, change nothing, and the same complaint follows you to the next review.',
    'That''s self-serving bias — protecting your self-image by attributing hard feedback to her flaws ("she doesn''t get my style," "she favors the other analyst") rather than testing it. We discount criticism that threatens us and accept praise that doesn''t. The cost is a blind spot that persists. Treat feedback as a hypothesis: ask for examples and check before you dismiss.',
    false, 5),
  ('work-tough-feedback', 2,
    'You nod politely, then ignore it; nothing changes, and she notices next cycle.',
    'Outward agreement with inward dismissal is self-serving bias wearing manners. You''ve filed the feedback as her problem, not yours, without ever examining it — which protects your self-image and forfeits the improvement. Feedback that stings is often the useful kind. Ask for concrete examples and test it honestly; polite avoidance costs you the growth and, eventually, her trust.',
    false, 5),
  ('work-tough-feedback', 3,
    'You gather examples, see the pattern is real, and your writing sharpens over the next month.',
    'Exactly right. You resisted self-serving bias — the urge to reframe painful feedback as the giver''s bias — and tested the claim instead. Asking for examples turns a threat to your ego into data you can act on. The deepest professional growth hides in the feedback we least want to hear; the skill is checking it before judging it.',
    true, 20),
  -- 8 · work-team-underperforms
  ('work-team-underperforms', 1,
    'You tell the skip-level the team lacked drive; morale drops and the real causes go unfixed.',
    'That''s self-serving bias and the fundamental attribution error working together. You explain the miss by the team''s character ("not hungry") while framing your own vague priorities and pivots as reasonable situational calls — the exact asymmetry both biases produce. Leaders who do this lose their teams and repeat the mistake. Own your controllable part first, then examine team factors together.',
    false, 5),
  ('work-team-underperforms', 2,
    'You name how your shifting priorities hurt, then work through the rest with the team; trust and clarity improve.',
    'Well done — you overrode two biases at once: self-serving bias (blaming outward, crediting inward) and the fundamental attribution error (reading the team''s effort as character, not circumstance you helped create). Owning your part first makes it safe for the team to own theirs, and surfaces the real, fixable causes. It''s the credibility a leader is built on.',
    true, 20),
  ('work-team-underperforms', 3,
    'You pin it on unrealistic top-down goals; you may be half-right, and still learn nothing about your own role.',
    'The goals may well have been unrealistic — but reaching for the fully external cause, while treating your own pivots as reasonable, is self-serving bias choosing the story that clears you. It skips the part you controlled: unclear priorities and mid-quarter changes. Name your contribution alongside the goal-setting problem; owning the controllable piece is where a leader actually improves.',
    false, 5),
  -- 9 · work-task-estimate
  ('work-task-estimate', 1,
    'You give a buffered range; it lands close to reality and you deliver without drama.',
    'Well judged. Naming "two days" from a confident gut would have been the overconfidence effect — trusting the feeling of certainty over your track record of edge cases and broken dependencies. You anchored to how these jobs actually go and added a buffer. Estimate from history, not hope; the base rate of your own past work beats your best-case imagination.',
    true, 20),
  ('work-task-estimate', 2,
    'You commit to two days; edge cases and a broken dependency push it to four, and the plan around you slips.',
    'That''s the overconfidence effect, in its planning-fallacy form. The feeling of "I know this" outran the evidence — similar jobs had burned you before — so you gave a best-case number others then built on. Confidence isn''t accuracy. Estimate from how these tasks have actually gone, widen the range, and add a buffer for the surprises you can''t yet name.',
    false, 5),
  ('work-task-estimate', 3,
    'You say two days and privately hope; hope doesn''t hold, and you''re explaining the overrun by Thursday.',
    'Committing to a best-case number while quietly hoping is the overconfidence effect with a fig leaf. A private hope changes nothing about the edge cases and dependencies that burned you last time. If you don''t trust the estimate enough to say it without hoping, that''s the signal to widen it. Estimate from your real history and buffer for the unknown.',
    false, 5),
  -- 10 · work-wing-presentation
  ('work-wing-presentation', 1,
    'You wing it; a hard question catches you flat, and you lose the room just like last time.',
    'That''s the overconfidence effect. Knowing the material felt like being ready to present it — but they''re different skills, and your certainty ignored the very failure you''d already lived. Confidence is a feeling, not a forecast of performance. The counter is a quick reality check: rehearse once and pre-load the hardest questions, precisely because feeling sure is when you skip them.',
    false, 5),
  ('work-wing-presentation', 2,
    'You skim the slides once; it''s not enough, and the tough questions still expose the gaps.',
    'A quick skim feels like diligence but is the overconfidence effect negotiating with itself — doing the minimum because you''re "basically ready." Reading slides isn''t rehearsing answers, and the room''s hardest questions are exactly what a skim skips. When you feel most sure is when a real run-through and prepped tough questions pay off most, because that''s when you''re tempted to skip them.',
    false, 5),
  ('work-wing-presentation', 3,
    'You rehearse once and prep the hard questions; the next day you field them cleanly and hold the room.',
    'Exactly right. You treated "I know it cold" as the warning sign it is — the overconfidence effect — and did the small prep that certainty tempts you to skip. Rehearsing surfaces gaps that silent confidence hides, and pre-loading tough questions is where presentations are won. Let past fumbles, not present certainty, set your prep.',
    true, 20),
  -- 11 · work-interview-prep
  ('work-interview-prep', 1,
    'You keep it light; a question about their product shift catches you cold, and the "click" never comes.',
    'That''s the overconfidence effect. Feeling sure you''ll connect stood in for actually preparing, and certainty about rapport says nothing about whether you can speak to their recent moves or your weak spots. Confidence and readiness are different things. For anything you want, prepare as if the feeling of "I''ve got this" is exactly the illusion to guard against.',
    false, 5),
  ('work-interview-prep', 2,
    'You research their pivot and drill your weak answers; the conversation lands, and so do you.',
    'Well done. You didn''t let certainty about "clicking" replace preparation — which is how the overconfidence effect usually costs people the things they want. Confidence feels like readiness but doesn''t create it. By preparing hardest where you''re weakest and studying their actual situation, you made the good impression you were counting on instead of assuming it.',
    true, 20),
  ('work-interview-prep', 3,
    'You reread your résumé and trust instinct; you''re fluent about your past, blank on their present.',
    'Rereading your own résumé is comfortable and confirms what you already know — it''s the overconfidence effect choosing easy prep over the useful kind. It leaves you sharp on yourself and unready for their recent product shift or your weak spots. Prepare where you''re likely to be tested, not where you already feel strong; certainty about rapport isn''t a plan.',
    false, 5),
  -- 12 · work-launch-timeline
  ('work-launch-timeline', 1,
    'You set the date from how projects really run; it holds, and the company trusts the number.',
    'Exactly right. A best-case six weeks would have been the overconfidence effect — the planning fallacy — assuming this time dodges the sick days, surprises, and scope creep that took your last three projects 40% over. You planned from the base rate of your own history, buffer included. Trust the record over the optimistic story; a date that holds beats a bold one that slips.',
    true, 20),
  ('work-launch-timeline', 2,
    'You commit to six weeks; the usual surprises arrive on schedule, and you ship late and apologetic.',
    'That''s the overconfidence effect as the planning fallacy. "This time I''ve planned it tightly" is what optimism always whispers, yet three straight projects ran ~40% over from the very risks this plan assumes away. Tight planning doesn''t abolish the unknown. Base the date on how your projects actually go, not the flawless run in your head, and buffer for it.',
    false, 5),
  ('work-launch-timeline', 3,
    'You promise seven weeks and hope; it''s still a best-case guess, and the 40% pattern blows past it.',
    'Adding a week feels prudent but is still anchored to the optimistic plan, not the evidence — the overconfidence effect lightly discounted. Your history says ~40% over, which on six weeks is closer to eight and a half. A token buffer chosen to "sound safe" isn''t the base rate. Set the date from how these projects have genuinely run, and size the buffer to that.',
    false, 5)
) as v(scenario_slug, sort_order, result_text, explanation, is_correct, xp_reward)
join public.scenarios sc on sc.slug = v.scenario_slug
join public.scenario_choices c on c.scenario_id = sc.id and c.sort_order = v.sort_order;

-- ----------------------------------------------------------------------------
-- 5. scenario_biases — primary per scenario; the leader scenario combines both.
-- ----------------------------------------------------------------------------
insert into public.scenario_biases (scenario_id, bias_id)
select sc.id, b.id
from (values
  ('work-missed-deadline',    'fundamental-attribution-error'),
  ('work-quiet-newhire',      'fundamental-attribution-error'),
  ('work-curt-message',       'fundamental-attribution-error'),
  ('work-employment-gap',     'fundamental-attribution-error'),
  ('work-project-credit',     'self-serving-bias'),
  ('work-missed-target',      'self-serving-bias'),
  ('work-tough-feedback',     'self-serving-bias'),
  ('work-team-underperforms', 'self-serving-bias'),
  ('work-team-underperforms', 'fundamental-attribution-error'),
  ('work-task-estimate',      'overconfidence-effect'),
  ('work-wing-presentation',  'overconfidence-effect'),
  ('work-interview-prep',     'overconfidence-effect'),
  ('work-launch-timeline',    'overconfidence-effect')
) as v(scenario_slug, bias_slug)
join public.scenarios sc on sc.slug = v.scenario_slug
join public.biases b on b.slug = v.bias_slug;

-- ----------------------------------------------------------------------------
-- 6. scenario_pack_items — order within At Work (FAE -> self-serving -> overconfidence).
-- ----------------------------------------------------------------------------
insert into public.scenario_pack_items (pack_id, scenario_id, sort_order)
select p.id, sc.id, v.sort_order
from (values
  ('work-missed-deadline',    1),
  ('work-quiet-newhire',      2),
  ('work-curt-message',       3),
  ('work-employment-gap',     4),
  ('work-project-credit',     5),
  ('work-missed-target',      6),
  ('work-tough-feedback',     7),
  ('work-team-underperforms', 8),
  ('work-task-estimate',      9),
  ('work-wing-presentation',  10),
  ('work-interview-prep',     11),
  ('work-launch-timeline',    12)
) as v(scenario_slug, sort_order)
cross join (select id from public.scenario_packs where slug = 'at-work') p
join public.scenarios sc on sc.slug = v.scenario_slug;

-- ----------------------------------------------------------------------------
-- 7. Publish the pack.
-- ----------------------------------------------------------------------------
update public.scenario_packs
  set is_published = true, updated_at = now()
  where slug = 'at-work';
