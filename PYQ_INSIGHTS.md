# SSC JHT Paper 1 — Deep PYQ Analysis (12-Aug-2025)
Source: official candidate response sheet, OCR'd from 56-page scanned PDF.

## 1. Overall structure
- **PART A — General Hindi (Q.1–100)**: 100 Q / 100 marks
- **PART B — General English (Q.101–200)**: 100 Q / 100 marks
- 4-option MCQs, −0.25 negative marking, 2 hours.

## 2. PART A — HINDI topic breakdown (Q.1–100)
Derived by reading every question stem on pages 1–25:

| Topic cluster | Approx Q-range | Count | Notes |
|---|---|---|---|
| **गद्यांश बोध / Comprehension** | Q.1–21 | ~21 | Q.1 standalone; then 4 passages × 5 Qs: (1) विज्ञान और तकनीक, (2) प्रेमचंद "मंगलसूत्र", (3) ब्लॉकचेन, (4) भारत का भूगर्भीय स्वरूप. Tests inference, author's tone, detail, "which is contrary". |
| **वाक्य प्रकार (सरल/संयुक्त/मिश्र)** | Q.25,27,31,32,40,54,55,62,63,73,79 | ~11 | Recurring; classify given sentences. |
| **पारिभाषिक/प्रशासनिक शब्द (EN↔HI)** | Q.33,35,39,42,44,45,48,52,59,61,66,80,86,87,88,89,97 | ~17 | **Largest discrete cluster** — translation-core: Adjustment, Acknowledgement, Deputation, Cadre, gazette notification, अधिवेशन, अवलोकन, etc. |
| **पर्यायवाची / समानार्थी (Synonyms)** | Q.22,26,36,49,65,69,92,96,100 | ~9 | Includes rare/classical: सहस्रांशू (चंद्रमा), व्योम (आकाश), मारुत/अनिल (वायु), अविनाशी (अमर), पक्षी (विहग). |
| **विलोम (Antonyms)** | Q.41,78,85,90 | ~4 | आश्रित→स्वतंत्र, गूढ→सरल/प्रकट, वैराग्य→मोह, विग्रह→संधि. |
| **विराम चिन्ह (Punctuation)** | Q.23,47,50,58,67,71,81 | ~7 | अपूर्णविराम=अर्द्धविराम; विवरण चिन्ह; choose punctuation for sentences. |
| **पूर्वाग्रह मुक्त भाषा (Bias-free)** | Q.1,28,46,53,70,72 | ~6 | **Modern emphasis**: rewrite "गाँव वाले अनपढ़", "नौकर", "गूँगे-बहरे" respectfully. |
| **स्थानीयकरण (Localization)** | Q.51,56,74,99 | ~4 | Identify unnatural localized Hindi; UI strings ("एरर! ट्राइ अगेन"). |
| **क्रिया प्रकार (Verb types)** | Q.43,68,75,83,94 | ~5 | सकर्मक/अकर्मक/प्रेरणार्थक/द्विकर्मक + क्रिया विशेषण + कारक. |
| **विशेषण (Adjectives)** | Q.34,64,82 | ~3 | व्यापक/परिणामवाचक विशेषण. |
| **शुद्ध वर्तनी (Spelling)** | Q.30,37,77,98 | ~4 | केंद्रीय हिंदी निदेशालय standard. |
| **मुहावरा (Idioms)** | Q.57 | ~1 | "कुआँ खुदवा के मेंढक पकड़ना". |
| **बहुअर्थी शब्द (Multiple meaning)** | Q.24,29,60,93 | ~4 | कल=समय/मृत्यु; गति=चलन/दशा; कलश=घड़ा/चोटी; सारंग. |
| **व्यंग्यार्थ (Irony/figure of speech)** | Q.76 | ~1 | |

### Hindi difficulty distribution (calibrated)
- Comprehension inference Qs = **3** (need passage reasoning)
- Comprehension detail Qs = **2** (locate in text)
- Synonym/antonym common words = **2**
- Synonym/antonym rare/classical words = **4**
- Sentence classification = **2–3**
- Admin/translation terminology = **3** (domain knowledge)
- Punctuation rules = **2**
- Spelling = **3** (subtle errors)

## 3. PART B — ENGLISH topic breakdown (Q.101–200)
From pages 26+ (analysis continues as OCR completes):

| Topic cluster | Approx Q-range | Notes |
|---|---|---|
| **Idioms** | Q.101 | "keep the wolf away from the door" = avoid financial hardship. |
| **Cloze / fill-in-blank** | Q.102–105+ | Long passage (Bangalore climate), tests tense, verb form, descriptive phrase, vocab in context. 5 blanks. |
| *(more to follow after OCR of p28–56)* | | Expected: error detection, synonyms/antonyms, sentence correction, one-word substitution, voice/narration, spelling. |

## 4. Key patterns for the adaptive engine to learn
1. **Translation terminology is the single biggest cluster (~17%)** — the engine must drill EN↔HI admin terms hardest.
2. **Comprehension dominates (~21%)** — passages are long; engine should weight inference/tone skills.
3. **Modern, inclusive language is explicitly tested** (bias-free, localization) — unusual for traditional prep; worth dedicated drills.
4. **Classical/rare synonyms** are favoured over common ones — difficulty spike.
5. **Same skill recurs 10+×** (sentence classification, verb types) — spaced repetition pays here.
6. **Distractor pattern**: options are plausible near-misses (e.g., सरल वाक्य vs संयुक्त वाक्य differ by one conjunction).

## 5. Engine calibration applied
- `DEFAULT_MOCK_STRUCTURE`: 100 HI + 100 EN, matching paper exactly.
- Topic weights in `engine.js` already drill weak areas; the taxonomy below maps 1:1 to the PYQ clusters.
- Difficulty baked per-question from the calibration table above (rare synonyms=4, admin terms=3, etc.) — **0 runtime neurons**.
