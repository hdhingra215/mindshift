-- ============================================================================
-- MindShift — Phase 5D.4: "People & Relationships" Scenario Library
-- ============================================================================
-- Full playable content for the ONE pack "people-and-relationships" (Phase 5C):
-- 12 scenarios, choices, outcomes, bias links, pack items, then publish.
-- Structure/quality mirror the Everyday Traps benchmark (20260723000003).
--
-- Scope — People & Relationships only. No schema changes, no new tables, no
-- RLS/gameplay code.
--
-- Biases taught (the 3 assigned), 4 primary each; one scenario combines the
-- character-judgment/echo-chamber pair (ContentStrategy §2, §3):
--   confirmation-bias             (family: belief-evidence)
--   belief-perseverance           (family: belief-evidence)
--   fundamental-attribution-error (family: self-social)
--
-- FAE cases here are deliberately DIFFERENT domains from the At Work pack
-- (partner, friend, parent, a stranger online) — no repetition across packs.
--
-- Arc: medium, growing subtler; the two subtlest (a retracted health claim, a
-- stranger online) are `hard`. Correct-answer POSITION varied (§6). XP: correct
-- 20, else 5. Outcome split: result_text = what happened; explanation = bias ->
-- mechanism -> counter -> transfer (§7). Correct outcomes still teach.
--
-- Reflection prompts (by scenario slug):
--   people-dating-greenflags : When did liking someone lead you to explain away things you''d normally notice?
--   people-partner-late      : When did you assign a motive to someone close before hearing what happened?
--   people-family-debate     : Have you ever searched to win an argument rather than to find the truth?
--   people-friend-unreplied  : When did silence from someone make you assume the worst about how they feel?
--   people-suspicious-partner: Have you ever built a "case" for a suspicion instead of simply asking?
--   people-parent-criticism  : When did you read worry or clumsiness from family as control or judgment?
--   people-friend-advice     : Have you asked for advice when you really wanted permission?
--   people-first-impression  : When has a first impression outlived all the evidence against it?
--   people-debunked-rumor    : Have you stayed wary of someone after the story about them was disproven?
--   people-changed-friend    : Who are you still treating as the person they used to be?
--   people-retracted-claim   : What belief do you still act on after its original basis fell apart?
--   people-stranger-online   : When did one harsh message make you decide who a whole person is?
--
-- Idempotency: `people-` slug prefix (unique to this pack). Re-run deletes and
-- re-inserts this pack''s children; scenarios upsert on slug. Safe pre-launch.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. scenarios — 12 rows. category_id = the PRIMARY bias''s family, by slug.
-- ----------------------------------------------------------------------------
insert into public.scenarios
  (slug, title, context, stakes, difficulty, category_id, source, status, version)
values
  (
    'people-dating-greenflags',
    'Everything Fits',
    'Three dates in, you''ve decided you really like her. Now you catch yourself reading everything to fit that: her sarcasm is "wit," her flakiness is "spontaneity." A friend gently notes she''s cancelled on you twice. You''re already building the case for why it''s fine.',
    'Whether you see her clearly now, or only after it costs you.',
    'medium',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  ),
  (
    'people-partner-late',
    'Forty Minutes Late',
    'Your partner is forty minutes late to dinner again, no message. Your chest tightens: he''s selfish, he doesn''t prioritise us. You don''t yet know his train was cancelled and his phone died. He walks in, flustered, about to explain.',
    'An evening, and the story you tell yourself about who he is.',
    'medium',
    (select id from public.categories where slug = 'self-social'),
    'authored', 'published', 1
  ),
  (
    'people-family-debate',
    'To Prove Him Wrong',
    'At dinner your uncle challenges a strong opinion you hold. Stung, you pull out your phone to "check" — and find yourself typing searches worded to prove him wrong, skimming past anything that complicates your side. You want to come back with a win.',
    'Being right in an argument, or actually knowing what''s true.',
    'medium',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  ),
  (
    'people-friend-unreplied',
    'Five Days of Silence',
    'Your close friend hasn''t answered your last two messages in five days. Your mind spirals: she''s annoyed with me, I must have said something. You can''t see that she''s buried under a work crisis and a sick parent. You''re deciding whether to send a hurt, pointed follow-up.',
    'A friendship, and whether you read silence as a message it isn''t.',
    'medium',
    (select id from public.categories where slug = 'self-social'),
    'authored', 'published', 1
  ),
  (
    'people-suspicious-partner',
    'Building a File',
    'A small thing made you wonder if your partner is hiding something. Now you''re rereading old texts, noting every late reply, quietly building "evidence." You haven''t weighed the dozen ordinary explanations, or simply asked. The suspicion is starting to feel like proof.',
    'Trust between you, against a case you''re constructing alone.',
    'medium',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  ),
  (
    'people-parent-criticism',
    'You Look Tired',
    'Your mother comments, again, that you look tired and should "take better care of yourself." You bristle: she''s controlling, always judging. It doesn''t occur to you that she''s worried and clumsy with words, not critical of your worth. She''s waiting for your reaction.',
    'A recurring fight, or a chance to hear what she actually means.',
    'medium',
    (select id from public.categories where slug = 'self-social'),
    'authored', 'published', 1
  ),
  (
    'people-friend-advice',
    'Asking for Permission',
    'You''ve privately decided to quit your job. You ask three friends what they think — but you press the one who agrees for more, and quietly discount the two raising real concerns. You tell yourself you "gathered input." You mostly wanted permission.',
    'A big decision made on one voice instead of three.',
    'medium',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  ),
  (
    'people-first-impression',
    'Arrogant at the Party',
    'You met him at a party where he came across as arrogant. Months on, he''s been consistently generous and humble — helped you move, remembered your kid''s name. Yet "arrogant" still colours how you read him, and you catch yourself explaining away the kindness.',
    'A real friendship, blocked by one bad first meeting.',
    'medium',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  ),
  (
    'people-debunked-rumor',
    'Where There''s Smoke',
    'A year ago you heard a friend-of-a-friend had cheated someone in a deal, and you quietly wrote him off. Last week you learned the story was flatly untrue — a mix-up with someone else. And yet, when you see him, the old wariness still rises unbidden.',
    'A fair chance for someone the facts have cleared.',
    'medium',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  ),
  (
    'people-changed-friend',
    'The Guy Who Bailed',
    'An old friend who used to be flaky and self-absorbed has clearly grown — reliable, thoughtful, years of proof. But in your head he''s still "the guy who bailed on my birthday," and you keep half-expecting him to let you down, planning around a person who no longer exists.',
    'A friendship stuck in the past, and the friend he actually is now.',
    'medium',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  ),
  (
    'people-retracted-claim',
    'The Study Was Pulled',
    'Years ago you read, confidently, that a certain food was basically toxic, and you''ve avoided it since. Recently the claim was thoroughly retracted — the study was flawed and withdrawn. Knowing that, you still feel a flicker of dread reaching for it, and you notice yourself inventing new reasons to keep avoiding it.',
    'Whether a belief updates when its one reason collapses.',
    'hard',
    (select id from public.categories where slug = 'belief-evidence'),
    'authored', 'published', 1
  ),
  (
    'people-stranger-online',
    'One Harsh Reply',
    'On a forum, a stranger leaves a harsh, dismissive reply to your post. You immediately peg him as a jerk — then click his profile, reading his other comments through that lens and finding "proof" everywhere. You never consider he might be having a terrible day, or that you''re only noticing the bad ones.',
    'Your peace of mind, spent judging a stranger you''ll never meet.',
    'hard',
    (select id from public.categories where slug = 'self-social'),
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
  where scenario_id in (select id from public.scenarios where slug like 'people-%');
delete from public.scenario_biases
  where scenario_id in (select id from public.scenarios where slug like 'people-%');
delete from public.scenario_choices
  where scenario_id in (select id from public.scenarios where slug like 'people-%');

-- ----------------------------------------------------------------------------
-- 3. scenario_choices — 3 per scenario. Trap choices carry the target bias_id.
-- ----------------------------------------------------------------------------
insert into public.scenario_choices (scenario_id, label, body, is_trap, bias_id, sort_order)
select sc.id, v.label, null, v.is_trap, b.id, v.sort_order
from (values
  -- 1 · people-dating-greenflags (confirmation) — correct @ 2
  ('people-dating-greenflags', 1, 'Brush off the cancellations — you can tell she''s great, and your friend just doesn''t see it.', true,  'confirmation-bias'),
  ('people-dating-greenflags', 2, 'Notice you''re only collecting evidence that fits, and watch the next few weeks honestly.', false, null),
  ('people-dating-greenflags', 3, 'End it now over the two cancellations, just to be safe.', false, null),
  -- 2 · people-partner-late (FAE) — correct @ 1
  ('people-partner-late', 1, 'Take a breath and hear what happened before deciding what it means.', false, null),
  ('people-partner-late', 2, 'Open with "you clearly don''t care about my time."', true,  'fundamental-attribution-error'),
  ('people-partner-late', 3, 'Say nothing, and let a cold silence do the talking.', false, null),
  -- 3 · people-family-debate (confirmation) — correct @ 3
  ('people-family-debate', 1, 'Search for the strongest points on your side and fire them back.', true,  'confirmation-bias'),
  ('people-family-debate', 2, 'Drop it and change the subject to dodge the argument.', false, null),
  ('people-family-debate', 3, 'Search as if trying to prove yourself wrong, and see what actually holds up.', false, null),
  -- 4 · people-friend-unreplied (FAE) — correct @ 2
  ('people-friend-unreplied', 1, 'Send something clipped so she knows the silence hurt.', true,  'fundamental-attribution-error'),
  ('people-friend-unreplied', 2, 'Assume life got heavy, and check in warmly without keeping score.', false, null),
  ('people-friend-unreplied', 3, 'Go quiet too, matching her silence.', false, null),
  -- 5 · people-suspicious-partner (confirmation) — correct @ 1
  ('people-suspicious-partner', 1, 'Notice you''re only hunting for confirmation, and just ask him directly.', false, null),
  ('people-suspicious-partner', 2, 'Keep quietly gathering evidence until the picture is undeniable.', true,  'confirmation-bias'),
  ('people-suspicious-partner', 3, 'Assume the worst and start pulling away to protect yourself.', false, null),
  -- 6 · people-parent-criticism (FAE) — correct @ 3
  ('people-parent-criticism', 1, 'Snap that she''s always so controlling and judgmental.', true,  'fundamental-attribution-error'),
  ('people-parent-criticism', 2, 'Shut down and give one-word answers for the rest of the visit.', false, null),
  ('people-parent-criticism', 3, 'Read it as clumsy worry, not control, and tell her what support would actually help.', false, null),
  -- 7 · people-friend-advice (confirmation) — correct @ 2
  ('people-friend-advice', 1, 'Go with it — most of the useful advice pointed your way anyway.', true,  'confirmation-bias'),
  ('people-friend-advice', 2, 'Sit properly with the two objections you skated past, then decide.', false, null),
  ('people-friend-advice', 3, 'Ask a few more people until the balance tips your way.', false, null),
  -- 8 · people-first-impression (belief-perseverance) — correct @ 1
  ('people-first-impression', 1, 'Let months of evidence overwrite a single bad first meeting.', false, null),
  ('people-first-impression', 2, 'Trust your first read — first impressions usually don''t lie.', true,  'belief-perseverance'),
  ('people-first-impression', 3, 'Stay neutral, but keep him at arm''s length just in case.', false, null),
  -- 9 · people-debunked-rumor (belief-perseverance) — correct @ 3
  ('people-debunked-rumor', 1, 'Stay a little guarded — where there''s smoke, there''s usually something.', true,  'belief-perseverance'),
  ('people-debunked-rumor', 2, 'Avoid him; it''s easier than sorting out your feelings.', false, null),
  ('people-debunked-rumor', 3, 'Consciously reset to zero and treat him as if the false story never happened.', false, null),
  -- 10 · people-changed-friend (belief-perseverance) — correct @ 2
  ('people-changed-friend', 1, 'Keep your guard up — people don''t really change.', true,  'belief-perseverance'),
  ('people-changed-friend', 2, 'Update your image of him to match the reliable person he''s been for years.', false, null),
  ('people-changed-friend', 3, 'Test him with something small before trusting the change.', false, null),
  -- 11 · people-retracted-claim (belief-perseverance) — correct @ 1
  ('people-retracted-claim', 1, 'Accept the belief lost its basis, and let the retraction actually change what you do.', false, null),
  ('people-retracted-claim', 2, 'Keep avoiding it — better safe than sorry, whatever the retraction says.', true,  'belief-perseverance'),
  ('people-retracted-claim', 3, 'Go find a different article that still supports avoiding it.', false, null),
  -- 12 · people-stranger-online (FAE + confirmation) — correct @ 3
  ('people-stranger-online', 1, 'Conclude he''s just a toxic person — his comment history proves it.', true,  'fundamental-attribution-error'),
  ('people-stranger-online', 2, 'Fire back an equally cutting reply to put him in his place.', false, null),
  ('people-stranger-online', 3, 'Notice you''re judging his character and cherry-picking to confirm it, and let it go.', false, null)
) as v(scenario_slug, sort_order, label, is_trap, bias_slug)
join public.scenarios sc on sc.slug = v.scenario_slug
left join public.biases b on b.slug = v.bias_slug;

-- ----------------------------------------------------------------------------
-- 4. outcomes — one per choice. Joined by (scenario_slug, sort_order).
-- ----------------------------------------------------------------------------
insert into public.outcomes (choice_id, result_text, explanation, is_correct, xp_reward)
select c.id, v.result_text, v.explanation, v.is_correct, v.xp_reward
from (values
  -- 1 · people-dating-greenflags
  ('people-dating-greenflags', 1,
    'You wave the cancellations away; weeks later the flakiness is a pattern you''d already decided to ignore.',
    'That''s confirmation bias. Once you decided you liked her, you recruited every detail as support and reframed the flaws — the cancellations your friend flagged got explained away rather than weighed. Liking someone isn''t the problem; only collecting evidence that flatters the conclusion is. Ask "what would change my mind?" and let disconfirming signs count as much as the green flags.',
    false, 5),
  ('people-dating-greenflags', 2,
    'You keep liking her but watch honestly; the picture that forms is real, not just the one you wanted.',
    'Well caught. You spotted confirmation bias in the act — reading everything to fit "I like her" and discounting a friend''s fair observation. Staying open isn''t cynicism; it''s letting the next weeks show you who she actually is. Notice when you''re building a case rather than testing one, in dating and everywhere you''ve already decided how you feel.',
    true, 20),
  ('people-dating-greenflags', 3,
    'You cut it off over two cancellations, trading one bias for an overcorrection.',
    'Ending it "to be safe" swings from confirmation bias to its opposite — now the cancellations are the only evidence that counts. Two missed dates are data, not a verdict. The balanced move isn''t to explain everything away or to convict on one flag; it''s to hold the pleasant story loosely and let a few honest weeks, good signs and bad, actually inform you.',
    false, 5),
  -- 2 · people-partner-late
  ('people-partner-late', 1,
    'You listen first; the cancelled train explains it, and a needless fight never starts.',
    'Well handled. The tightening in your chest wanted to name his character — "selfish" — which is the fundamental attribution error: explaining his lateness by who he is, not the situation you couldn''t see. We reserve situational grace for ourselves. Hearing the circumstances first is how you avoid convicting someone you love of a crime the trains committed.',
    true, 20),
  ('people-partner-late', 2,
    'You lead with "you don''t care about my time"; he''s wounded, and the real reason arrives too late to matter.',
    'That''s the fundamental attribution error. Forty silent minutes got read as a statement about his character — selfish, uncaring — when the cause was situational: a cancelled train, a dead phone. We do this to others while excusing our own lateness by circumstance. Ask what happened before assigning a motive; most "they don''t care" moments have a mundane explanation.',
    false, 5),
  ('people-partner-late', 3,
    'You freeze him out; he spends the evening apologising for a train he couldn''t control.',
    'The cold silence still delivers a verdict — that his lateness reveals how little he cares — which is the fundamental attribution error dressed as restraint. Punishing the character you inferred, before hearing the situation, damages the evening either way. Give the benefit of the doubt you''d want for your own bad commute, and let him explain before you decide what it meant.',
    false, 5),
  -- 3 · people-family-debate
  ('people-family-debate', 1,
    'You fire back cherry-picked points and "win" the table, no closer to whether you''re actually right.',
    'That''s confirmation bias. Searching for ammunition — wording queries to prove your side and skimming past what complicates it — feels like research but only fortifies what you already believed. Winning the argument and being correct are different games. To learn rather than just defend, search for the strongest case against yourself; if your view survives that, it''s earned.',
    false, 5),
  ('people-family-debate', 2,
    'You change the subject; the fight ends, but so does any chance of finding out who was right.',
    'Avoiding the argument sidesteps the heat but not the bias — you never tested the opinion, you just protected it from challenge, which is confirmation bias by omission. Dropping it keeps the belief comfortable and unexamined. The braver, more useful move is to look up the question honestly, trying to disprove yourself, so the disagreement actually teaches you something.',
    false, 5),
  ('people-family-debate', 3,
    'You search to disprove yourself, find the picture is messier than you thought, and come back wiser than combative.',
    'Exactly right. Deliberately hunting for what contradicts you is the direct counter to confirmation bias — the habit of gathering only what confirms. It turns a family spat into genuine learning and, often, a more honest position. Do it whenever a belief matters: the test of an opinion isn''t how much support you can find, but whether it survives your best effort to break it.',
    true, 20),
  -- 4 · people-friend-unreplied
  ('people-friend-unreplied', 1,
    'You send the clipped message; she reads it mid-crisis, and now she''s hurt on top of overwhelmed.',
    'That''s the fundamental attribution error. Five days of silence got read as a statement about you — "she''s annoyed, I did something" — rather than her situation (a work crisis, a sick parent). Silence is ambiguous, and we fill it with character and self-blame. Assume a benign, situational reason first; a warm check-in costs nothing and is usually right.',
    false, 5),
  ('people-friend-unreplied', 2,
    'You check in warmly; she''s relieved, explains the chaos, and the friendship is closer for it.',
    'Well done. You resisted the fundamental attribution error — the pull to read her silence as a verdict on you instead of a sign of her circumstances. Choosing the generous, situational explanation and reaching out without a scoreboard is almost always both kinder and more accurate. Silence rarely means what our anxiety insists it means.',
    true, 20),
  ('people-friend-unreplied', 3,
    'You match her silence; two hurt people now wait for the other, over nothing that was ever a slight.',
    'Going quiet in return still rests on the inferred motive — that her silence was aimed at you — which is the fundamental attribution error. It turns an imagined slight into a real standoff neither of you intended. When you can''t see the situation, assume the ordinary one (life got busy) and reach out; a scoreboard only compounds a misunderstanding.',
    false, 5),
  -- 5 · people-suspicious-partner
  ('people-suspicious-partner', 1,
    'You ask him directly; the ordinary explanation lands, and the spiral stops before it damages anything.',
    'Well done. Rereading texts and stockpiling "evidence" is confirmation bias — once a suspicion forms, the mind hunts for support and ignores the dozen innocent readings. A quiet case built alone becomes convincing precisely because it excludes anything reassuring. Asking directly is the disconfirming test that a self-built file will never run. Seek what would prove you wrong, especially about people you love.',
    true, 20),
  ('people-suspicious-partner', 2,
    'You keep building the file; every neutral thing now looks like proof, and the trust erodes on its own.',
    'That''s confirmation bias. A single doubt set the conclusion, and now every late reply is filed as evidence while ordinary explanations go unrecorded — the "undeniable picture" is undeniable because you only collected one side. Suspicion that only gathers support becomes self-confirming. Test it instead: ask the question that could dissolve the doubt, rather than the search that only deepens it.',
    false, 5),
  ('people-suspicious-partner', 3,
    'You pull away to protect yourself, acting on a case you never checked, and he feels the chill without knowing why.',
    'Withdrawing treats the self-built suspicion as settled fact — which is confirmation bias driving behaviour. You''ve skipped the one move that could confirm or dissolve it: asking. Protecting yourself from an unverified story quietly damages the relationship on the story''s behalf. Before acting on a suspicion, run the disconfirming test — a direct, honest question — rather than a private trial where only one side speaks.',
    false, 5),
  -- 6 · people-parent-criticism
  ('people-parent-criticism', 1,
    'You snap; she''s hurt, the old fight reignites, and her actual worry never gets heard.',
    'That''s the fundamental attribution error. A clumsy comment got read as her character — "controlling, judgmental" — rather than her situation: a worried parent, bad with words. We grant ourselves "I meant well"; we deny it to family fastest of all. Ask what feeling sits under the phrasing; "you look tired" is often love that landed badly, not a verdict on you.',
    false, 5),
  ('people-parent-criticism', 2,
    'You shut down; the visit chills, and both of you leave with the misunderstanding intact.',
    'The silent treatment still acts on the inferred motive — that she''s judging you — which is the fundamental attribution error. Withdrawing punishes the character you assigned her while leaving her real intent (worry, awkwardly expressed) unspoken and unmet. Instead of reading control into clumsiness, name what you need: telling her how to support you turns a recurring fight into an actual conversation.',
    false, 5),
  ('people-parent-criticism', 3,
    'You hear the worry under the words, redirect it, and a familiar fight becomes a warm moment instead.',
    'Exactly right. You resisted the fundamental attribution error — reading "you look tired" as controlling character rather than clumsy concern — and responded to the situation behind it. With family, we''re quickest to assume the worst motive and slowest to grant the benefit of the doubt. Naming what actually helps turns inherited friction into connection. Extend the grace you''d want for your own graceless moments.',
    true, 20),
  -- 7 · people-friend-advice
  ('people-friend-advice', 1,
    'You quit, reassured by "most advice agreed" — advice you''d quietly weighted to agree.',
    'That''s confirmation bias. Asking three friends looked like due diligence, but pressing the one who agreed and discounting the two who didn''t means you engineered the consensus you wanted. Seeking advice to confirm a decision isn''t seeking advice. If a choice is sound, it should survive the objections you''re tempted to skip — so give the dissenters the same airtime as the ally.',
    false, 5),
  ('people-friend-advice', 2,
    'You take the two objections seriously; whether you quit or not, the decision is finally an honest one.',
    'Well done. You caught confirmation bias — hunting for permission rather than input — and did the hard part: engaging the concerns you''d skated past. The point isn''t to talk yourself out of quitting; it''s to decide with both sides genuinely weighed. When you notice you''re collecting yeses, deliberately steelman the no. A choice that survives that is one you can trust.',
    true, 20),
  ('people-friend-advice', 3,
    'You keep polling until the tally favours quitting, mistaking a bigger sample for a better one.',
    'Adding voices until the balance tips is confirmation bias scaled up — you''re not gathering wisdom, you''re shopping for a majority. More opinions don''t help if you keep the agreeable ones and discard the rest. The two original objections were the signal worth examining. Sit with the strongest case against your decision, not with whichever new voice finally says yes.',
    false, 5),
  -- 8 · people-first-impression
  ('people-first-impression', 1,
    'You let the months of kindness win; a genuine friendship you almost blocked gets to grow.',
    'Well done. "Arrogant" formed in one party-lit moment and then refused to leave — that''s belief perseverance, a belief outliving the evidence that made it. First impressions feel authoritative precisely because they came first. You weighed months of contrary proof over a single night, which is exactly the correction: when the evidence has clearly turned, let the conclusion turn with it.',
    true, 20),
  ('people-first-impression', 2,
    'You trust the first read; months of generosity keep bouncing off a verdict you reached in an hour.',
    'That''s belief perseverance. A first impression, formed in one setting, has hardened into "who he is" and now survives all the disconfirming evidence — the help, the warmth, the remembered names. First impressions aren''t oracles; they''re a single, often unrepresentative data point. When someone consistently contradicts your initial read, the honest move is to update the read, not to explain away the person.',
    false, 5),
  ('people-first-impression', 3,
    'You stay "neutral" but distant; the guardedness quietly preserves the very impression the facts have overturned.',
    'Arm''s length feels balanced, but it lets the original "arrogant" verdict keep running the relationship — which is belief perseverance. Neutrality that ignores months of positive evidence isn''t neutral; it''s the first impression, protected. When the data has clearly shifted, tepid distance is still a refusal to update. Let the accumulated evidence actually change how you treat him.',
    false, 5),
  -- 9 · people-debunked-rumor
  ('people-debunked-rumor', 1,
    'You stay guarded on "no smoke without fire," keeping a penalty in place for a crime that never happened.',
    'That''s belief perseverance. The wariness formed from a story you now know is false, yet it persists on its own momentum — "where there''s smoke" is the mind justifying a belief after its evidence is gone. A retracted rumour leaves a residue that feels like intuition. The fix is deliberate: name that the basis is gone, and consciously extend the clean slate the facts now demand.',
    false, 5),
  ('people-debunked-rumor', 2,
    'You just avoid him; it''s easier than facing that your wariness now rests on nothing.',
    'Avoidance sidesteps the discomfort but keeps the discredited belief in force — you''re still treating him as the rumour painted him, which is belief perseverance. Dodging the person spares you the work of updating, and quietly wrongs someone the facts have cleared. The honest move is to notice the belief lost its foundation and reset your treatment of him to match what you now know is true.',
    false, 5),
  ('people-debunked-rumor', 3,
    'You reset to zero, meet him as he is, and the false story stops costing him something he never earned.',
    'Exactly right. A discredited rumour tends to leave a felt residue — belief perseverance, the conclusion lingering after its evidence collapses. You did the deliberate correction: recognising the basis is gone and consciously clearing the slate rather than trusting the leftover unease. When you learn something that formed your view was false, actively rebuild the view; feelings lag facts unless you make them catch up.',
    true, 20),
  -- 10 · people-changed-friend
  ('people-changed-friend', 1,
    'You keep the guard up; he stays reliable and you keep bracing, straining a friendship over a person who''s gone.',
    'That''s belief perseverance. "Flaky, self-absorbed" was true once and has outlived years of contrary proof, because a belief about someone resists updating even as they change. "People don''t really change" is the story that protects the old verdict. When someone has demonstrably grown, the evidence is the new behaviour, not the memory. Let the reliable friend of today replace the one who bailed years ago.',
    false, 5),
  ('people-changed-friend', 2,
    'You update your picture of him; the friendship finally operates in the present, and it''s better for it.',
    'Well done. Holding onto "the guy who bailed" despite years of reliability is belief perseverance — an outdated belief surviving the evidence. You let sustained proof rewrite the image, which is exactly the correction. People do change, and clinging to who they were punishes who they''ve become. Judge others by their recent, consistent behaviour, not the version frozen in an old story.',
    true, 20),
  ('people-changed-friend', 3,
    'You set a little "test" first; the caution is understandable, but it still treats years of proof as not-yet-enough.',
    'A small test feels prudent, yet it reveals the old belief still holds the wheel — you''re asking a reliable friend to re-earn what he''s already demonstrated for years, which is belief perseverance softening its grip but not letting go. At some point accumulated evidence should simply update the verdict. Recognise the proof is already in, and extend the trust his recent, consistent behaviour has earned.',
    false, 5),
  -- 11 · people-retracted-claim
  ('people-retracted-claim', 1,
    'You let the retraction land, and the old dread loosens its grip on a choice it no longer has any right to.',
    'Exactly right — and genuinely hard. The belief formed from a claim now withdrawn, yet the dread lingered and your mind even generated fresh reasons to keep it: textbook belief perseverance, a conclusion outliving its evidence. Noticing the basis is gone and acting on that is the deliberate override. When the one study that built a belief is pulled, the belief should go with it, however stubborn the feeling.',
    true, 20),
  ('people-retracted-claim', 2,
    'You keep avoiding it "to be safe," letting a feeling outrank a fact you know to be corrected.',
    'That''s belief perseverance. The claim that justified avoiding the food has been retracted, but the belief runs on its own inertia, and "better safe than sorry" is the cover story that keeps it alive. A withdrawn study is no basis at all. The correction is uncomfortable but simple: when the evidence that formed a belief is gone, stop acting on the belief, even while the residual dread fades.',
    false, 5),
  ('people-retracted-claim', 3,
    'You go hunting for an article that still condemns the food, shopping for permission to keep the belief.',
    'This is belief perseverance recruiting confirmation bias as reinforcement — the original basis collapsed, so you go looking for any new source that lets the conclusion stand. Searching to justify a belief whose evidence was retracted isn''t inquiry; it''s protection. The honest response to a retraction is to drop the belief, not to re-source it. Seek the best current evidence, not the article that agrees with the ghost.',
    false, 5),
  -- 12 · people-stranger-online
  ('people-stranger-online', 1,
    'You brand him toxic, and his profile obligingly "proves" it — because you only read it looking for proof.',
    'Two biases at once. Reading one harsh reply as his whole character is the fundamental attribution error (a bad moment mistaken for a bad person), and scrolling his history to confirm it is confirmation bias (finding only what fits). Together they manufacture a villain from a stranger having a rough day. Notice both: a single comment is a situation, not a soul, and evidence you went looking for proves little.',
    false, 5),
  ('people-stranger-online', 2,
    'You fire back a cutting reply; now two strangers are being their worst, and you''ve spent real feeling on nothing.',
    'Retaliating locks in the snap judgment — that his comment defines him — which is the fundamental attribution error, ignoring the situation (a bad day, a misread) behind four hostile words. It also drags you into the same behaviour you condemned. Online, a harsh reply is almost always about the sender''s moment, not a verdict on you; the freeing move is to decline the character trial altogether.',
    false, 5),
  ('people-stranger-online', 3,
    'You clock what your mind is doing, close the profile, and reclaim the evening from a stranger.',
    'Exactly right. You caught both traps: the fundamental attribution error turning one reply into "a toxic person," and confirmation bias mining his profile for proof. Seeing the machinery is what disarms it. A stranger''s harsh comment is a snapshot of their situation, not a summary of their character, and evidence hunted to confirm a verdict isn''t evidence. Letting it go is the sane, and accurate, choice.',
    true, 20)
) as v(scenario_slug, sort_order, result_text, explanation, is_correct, xp_reward)
join public.scenarios sc on sc.slug = v.scenario_slug
join public.scenario_choices c on c.scenario_id = sc.id and c.sort_order = v.sort_order;

-- ----------------------------------------------------------------------------
-- 5. scenario_biases — primary per scenario; the stranger scenario combines two.
-- ----------------------------------------------------------------------------
insert into public.scenario_biases (scenario_id, bias_id)
select sc.id, b.id
from (values
  ('people-dating-greenflags',  'confirmation-bias'),
  ('people-partner-late',       'fundamental-attribution-error'),
  ('people-family-debate',      'confirmation-bias'),
  ('people-friend-unreplied',   'fundamental-attribution-error'),
  ('people-suspicious-partner', 'confirmation-bias'),
  ('people-parent-criticism',   'fundamental-attribution-error'),
  ('people-friend-advice',      'confirmation-bias'),
  ('people-first-impression',   'belief-perseverance'),
  ('people-debunked-rumor',     'belief-perseverance'),
  ('people-changed-friend',     'belief-perseverance'),
  ('people-retracted-claim',    'belief-perseverance'),
  ('people-stranger-online',    'fundamental-attribution-error'),
  ('people-stranger-online',    'confirmation-bias')
) as v(scenario_slug, bias_slug)
join public.scenarios sc on sc.slug = v.scenario_slug
join public.biases b on b.slug = v.bias_slug;

-- ----------------------------------------------------------------------------
-- 6. scenario_pack_items — order within People & Relationships (clear -> subtle).
-- ----------------------------------------------------------------------------
insert into public.scenario_pack_items (pack_id, scenario_id, sort_order)
select p.id, sc.id, v.sort_order
from (values
  ('people-dating-greenflags',  1),
  ('people-partner-late',       2),
  ('people-family-debate',      3),
  ('people-friend-unreplied',   4),
  ('people-suspicious-partner', 5),
  ('people-parent-criticism',   6),
  ('people-friend-advice',      7),
  ('people-first-impression',   8),
  ('people-debunked-rumor',     9),
  ('people-changed-friend',     10),
  ('people-retracted-claim',    11),
  ('people-stranger-online',    12)
) as v(scenario_slug, sort_order)
cross join (select id from public.scenario_packs where slug = 'people-and-relationships') p
join public.scenarios sc on sc.slug = v.scenario_slug;

-- ----------------------------------------------------------------------------
-- 7. Publish the pack.
-- ----------------------------------------------------------------------------
update public.scenario_packs
  set is_published = true, updated_at = now()
  where slug = 'people-and-relationships';
