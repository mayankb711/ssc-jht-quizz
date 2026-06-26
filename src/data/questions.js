/* ============================================================
   questions.js — calibrated question bank.
   Modelled on the exact patterns of the 12-Aug-2025 SSC JHT
   Paper 1 (see paper_analysis.txt). Difficulty calibrated from
   the paper's hardest/easiest question lists. Traps embedded
   match the documented distractor strategies.

   Schema:
     id         stable string
     topic      -> topics.js id
     skill      -> topics.js skill
     difficulty 1..5  (1 easy → 5 hard) — calibrated from PYQ
     passage    optional (string) shared stem for comprehension
     stem       question text (Hindi or English)
     options    [4 strings]
     answer     index 0..3 of correct option
     explain    short static explanation (offline fallback)
     source     'PYQ-2025-08-12' | 'AUTHORED'
     lang       'hi' | 'en'
   ============================================================ */

import { topicById } from './topics.js';

const P_TECH = 'विज्ञान और तकनीक ने मानव जीवन को अभूतपूर्व गति और सुविधा प्रदान की है। वह कार्य जो पहले घंटों में होते थे, अब मिनटों में पूरे हो जाते हैं। डिजिटल उपकरण, रोबोट, कृत्रिम बुद्धिमत्ता (AI) और मशीन लर्निंग जैसे नवाचारों ने हमारे जीवन को सरल तो बनाया है, लेकिन एक महत्वपूर्ण प्रश्न भी उठाया है — क्या इस तकनीकी प्रगति की चमक में हम अपनी संवेदनाओं की ऊष्मा को तो नहीं खो रहे? आज निर्णय लेने की प्रक्रिया तेजी से मानवीय विवेक से हटकर एल्गोरिदम और डेटा के आधार पर होने लगी है। कृत्रिम बुद्धिमत्ता उन क्षेत्रों में प्रवेश कर रही है जहाँ पहले केवल मानवीय अनुभव, भावना और अंतःप्रज्ञा की आवश्यकता होती थी — जैसे चिकित्सा निर्णय, न्याय व्यवस्था, या मानसिक परामर्श। ऐसे में प्रश्न यह उठता है कि क्या ये यंत्र उस भावनात्मक गहराई, सहानुभूति और नैतिकता को समझ सकते हैं जो एक मनुष्य की आत्मा का मूल गुण है? हम यंत्रों से गति ले सकते हैं, पर दिशा अपने अंतःकरण से ही चुननी होगी।';

export const QUESTIONS = [

  // =====================================================================
  // HINDI — गद्यांश बोध / COMPREHENSION (passage-based, inference-heavy)
  // =====================================================================
  { id: 'h001', topic: 'hi_comprehension', skill: 'inference', difficulty: 4, lang: 'hi', source: 'AUTHORED', passage: P_TECH,
    stem: 'इस गद्यांश के अनुसार तकनीकी प्रगति का सबसे बड़ा खतरा क्या है?',
    options: ['मनुष्य की रचनात्मकता में वृद्धि', 'मानवीय संवेदनाओं का क्षय', 'तकनीकी गति में कमी', 'डेटा संग्रहण की समस्या'],
    answer: 1,
    explain: 'अनुमान-प्रश्न है। गद्यांश कहता है "क्या हम संवेदनाओं की ऊष्मा को तो नहीं खो रहे" — अर्थात संवेदनाओं का क्षय ही सबसे बड़ा खतरा है।' },

  { id: 'h002', topic: 'hi_comprehension', skill: 'inference', difficulty: 5, lang: 'hi', source: 'AUTHORED', passage: P_TECH,
    stem: '"यंत्रों से गति लें, पर दिशा अंतःकरण से चुनें" — इस वाक्य का अभिप्राय है:',
    options: ['यंत्रों को नियंत्रित करना असंभव है', 'तकनीक से ही दिशा तय होती है', 'तकनीक सहायक है, पर निर्णय मानवीय विवेक से होने चाहिए', 'अंतःकरण अप्रासंगिक हो गया है'],
    answer: 2,
    explain: 'रूपक अर्थ वाला सबसे कठिन RC प्रकार। सभी विकल्प कथन के एक अंश को लेते हैं; सही उत्तर द्वैत को पकड़ता है — तकनीक से गति, अंतःकरण से दिशा।' },

  { id: 'h003', topic: 'hi_comprehension', skill: 'detail', difficulty: 2, lang: 'hi', source: 'AUTHORED', passage: P_TECH,
    stem: 'लेखक के अनुसार कृत्रिम बुद्धिमत्ता (AI) का कौन-सा क्षेत्र अत्यंत संवेदनशील है?',
    options: ['ऑनलाइन खरीदारी', 'स्वचालित वाहन', 'मानसिक परामर्श', 'संगीत रचना'],
    answer: 2,
    explain: 'गद्यांश में सीधे कहा गया: "चिकित्सा निर्णय, न्याय व्यवस्था, या मानसिक परामर्श"। विवरण-प्रश्न है।' },

  { id: 'h004', topic: 'hi_comprehension', skill: 'tone', difficulty: 3, lang: 'hi', source: 'AUTHORED', passage: P_TECH,
    stem: 'लेखक का तकनीक के प्रति दृष्टिकोण कैसा है?',
    options: ['पूर्णतः विरोधात्मक', 'केवल प्रशंसात्मक', 'संतुलनवादी और विवेकपूर्ण', 'अनावश्यक आशंका से ग्रस्त'],
    answer: 2,
    explain: 'लेखक तकनीक का उपयोग करता है (तो पूर्ण विरोधी नहीं), पर चेतावनी भी देता है (तो केवल प्रशंसक नहीं)। नूह-पहचान चाहिए।' },

  // =====================================================================
  // HINDI — पर्यायवाची (synonyms; includes "all 4 real synonyms" trap)
  // =====================================================================
  { id: 'h010', topic: 'hi_synonym', skill: 'rarest', difficulty: 5, lang: 'hi', source: 'AUTHORED',
    stem: "'चंद्रमा' के लिए निम्न में से सबसे दुर्लभ पर्यायवाची क्या है?",
    options: ['सोमराज', 'सहस्रांशु', 'निशापति', 'इन्दु'],
    answer: 1,
    explain: 'सभी चार वास्तविक पर्यायवाची हैं। सहस्रांशु = "हजार किरणों वाला", वैदिक साहित्य में, सबसे दुर्लभ। यह सबसे कठिन पर्यायवाची प्रारूप है।' },

  { id: 'h011', topic: 'hi_synonym', skill: 'classical', difficulty: 4, lang: 'hi', source: 'AUTHORED',
    stem: "'आकाश' के लिए निम्न में से शास्त्रीय (वैदिक/संस्कृत) पर्यायवाची कौन-सा है?",
    options: ['अन्तरिक्ष', 'व्योम', 'नभ', 'गगन'],
    answer: 1,
    explain: 'अन्तरिक्ष = बाहरी अंतरिक्ष (भिन्न अवधारणा), नभ/गगन = सामान्य काव्य। व्योम = विशेष रूप से वैदिक/शास्त्रीय साहित्य।' },

  { id: 'h012', topic: 'hi_synonym', skill: 'classical', difficulty: 5, lang: 'hi', source: 'AUTHORED',
    stem: "'मन' के लिए निम्न में से सबसे उपयुक्त दार्शनिक पर्यायवाची क्या है?",
    options: ['अन्तःकरण', 'आत्मा', 'बुद्धि', 'चेतना'],
    answer: 0,
    explain: 'जाल: आत्मा — सबसे प्रसिद्ध दार्शनिक शब्द, पर गलत। वेदांत में अन्तःकरण = आंतरिक सत्व (मन+बुद्धि+चित्त+अहंकार) = "मन" का सबसे सटीक प्रतिनिधि।' },

  { id: 'h013', topic: 'hi_synonym', skill: 'common', difficulty: 2, lang: 'hi', source: 'AUTHORED',
    stem: "'विहग' का समानार्थी शब्द क्या है?",
    options: ['पक्षी', 'कीड़ा', 'पशु', 'मछली'],
    answer: 0, explain: 'विहग = पक्षी (bird)।' },

  { id: 'h014', topic: 'hi_synonym', skill: 'classical', difficulty: 4, lang: 'hi', source: 'AUTHORED',
    stem: "'वायु' के लिए दार्शनिक/वैदिक पर्यायवाची शब्द क्या है?",
    options: ['मारुत', 'अनिल', 'समीर', 'वात'],
    answer: 0,
    explain: 'जाल: समीर (उर्दू-प्रभावित काव्य)। मारुत = विशेष रूप से वैदिक वायु देवता, उपनिषद्/दार्शनिक संदर्भ में प्रयुक्त।' },

  { id: 'h015', topic: 'hi_synonym', skill: 'all_real', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: "'अंधकार' का समानार्थी शब्द है:",
    options: ['उजाला', 'तम', 'प्रभा', 'प्रकाश'],
    answer: 1, explain: 'उजाला, प्रभा, प्रकाश = विलोम। तम = अंधकार का पर्यायवाची।' },

  // =====================================================================
  // HINDI — विलोम (antonyms; includes synonym-as-distractor trap)
  // =====================================================================
  { id: 'h020', topic: 'hi_antonym', skill: 'synonym_trap', difficulty: 4, lang: 'hi', source: 'AUTHORED',
    stem: "'आश्रित' का उपयुक्त विलोम क्या होगा?",
    options: ['निर्भर', 'सेवक', 'संपन्न', 'स्वतंत्र'],
    answer: 3,
    explain: 'जाल: निर्भर = आश्रित का SYNONYM (दोनों अर्थ dependent), विलोम नहीं। स्वतंत्र = independent = सही विलोम।' },

  { id: 'h021', topic: 'hi_antonym', skill: 'rare', difficulty: 4, lang: 'hi', source: 'AUTHORED',
    stem: "'गूढ़' (सूक्ष्म/गहरा) का विलोम क्या है?",
    options: ['स्पष्ट', 'सरल', 'प्रकट', 'रहस्यमय'],
    answer: 1,
    explain: 'जाल: स्पष्ट (आंशिक रूप से काम करता है पर कम सटीक); रहस्यमय = synonym। गूढ़ = गहरा/जटिल का सही विपरीत = सरल (simple)।' },

  { id: 'h022', topic: 'hi_antonym', skill: 'common', difficulty: 2, lang: 'hi', source: 'AUTHORED',
    stem: "'विग्रह' का विलोम है:",
    options: ['कलह', 'विवाद', 'संधि', 'युद्ध'],
    answer: 2, explain: 'कलह, विवाद, युद्ध = विग्रह के पर्यायवाची। संधि = मिलन/शांति = विपरीत।' },

  // =====================================================================
  // HINDI — वाक्य रचना (sentence classification)
  // =====================================================================
  { id: 'h030', topic: 'hi_sentence_type', skill: 'classify', difficulty: 2, lang: 'hi', source: 'AUTHORED',
    stem: 'निम्नलिखित में से सरल वाक्य पहचानिए:',
    options: ['सुबह का सूरज आकाश में तेजी से चमक रहा है', 'मैं खाना खाता हूँ और टीवी देखता हूँ', 'वह दौड़ा क्योंकि ट्रेन छूट रही थी', 'जब मैं आया, तब तुम सो रहे थे'],
    answer: 0,
    explain: 'केवल एक उपवाक्य = सरल। "और" = संयुक्त, "क्योंकि" = मिश्र, "जब...तब" = मिश्र।' },

  { id: 'h031', topic: 'hi_sentence_type', skill: 'identify', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: 'संयुक्त वाक्य की पहचान कीजिए:',
    options: ['वह आया, पर उसने कुछ नहीं कहा', 'मैं बाजार गया', 'सूरज निकल रहा है', 'अगर वह आएगा, तो हम मिलेंगे'],
    answer: 0,
    explain: '"पर" = समन्वयक योजक (coordinating conjunction) = संयुक्त वाक्य। बाकी सरल या मिश्र हैं।' },

  { id: 'h032', topic: 'hi_sentence_type', skill: 'classify', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: 'मिश्र वाक्य का उदाहरण चुनिए:',
    options: ['अगर वह आएगा, तो हम मिलेंगे', 'बच्चे खेलते हैं', 'सूरज चमक रहा है', 'वह पढ़ रहा है'],
    answer: 0, explain: '"अगर...तो" = अधीनस्थ योजक (subordinating) = मिश्र वाक्य।' },

  { id: 'h033', topic: 'hi_sentence_type', skill: 'not_x', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: 'निम्न में से कौन-सा वाक्य संयुक्त वाक्य नहीं है?',
    options: ['सूरज डूब रहा है और चाँद निकल रहा है', 'बच्चे स्कूल जाते हैं', 'मैं पढ़ता हूँ और वह खेलता है', 'वह आया लेकिन कुछ नहीं कहा'],
    answer: 1, explain: '"बच्चे स्कूल जाते हैं" = सरल वाक्य (एक उपवाक्य), संयुक्त नहीं।' },

  { id: 'h034', topic: 'hi_sentence_type', skill: 'gender', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: 'निम्न में से कौन-सा एक वाक्य शुद्ध है?',
    options: ['मैं कानपुर गया था', 'मेरा पुस्तक खो गया', 'लता दो चिट्ठी लिखी', 'यह तो मेरा पुस्तक है'],
    answer: 0,
    explain: '"पुस्तक" = स्त्रीलिंग → "मेरी पुस्तक"। "दो चिट्ठी" → "दो चिट्ठियाँ"। केवल "मैं कानपुर गया था" शुद्ध।' },

  // =====================================================================
  // HINDI — प्रशासनिक / पारिभाषिक शब्दावली (translation terms)
  // =====================================================================
  { id: 'h040', topic: 'hi_terminology', skill: 'hi_to_en', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: 'प्रशासनिक शब्द "समायोजन" के लिए उपयुक्त अंग्रेजी शब्द क्या होगा?',
    options: ['Agreement', 'Adjustment', 'Adjournment', 'Agenda'],
    answer: 1,
    explain: 'जाल: Agreement = समझौता (≠ समायोजन)। समायोजन = Adjustment। यह भ्रम अत्यंत सामान्य है।' },

  { id: 'h041', topic: 'hi_terminology', skill: 'hi_to_en', difficulty: 4, lang: 'hi', source: 'AUTHORED',
    stem: 'पारिभाषिक शब्द "स्वीकृति" के लिए उपयुक्त अंग्रेजी शब्द क्या होगा?',
    options: ['Adjourn', 'Agrarian', 'Agenda', 'Acknowledgement'],
    answer: 3,
    explain: 'सभी चार विकल्प "A" से शुरू — जानबूझकर भ्रम पैदा करते हैं। Adjourn=स्थगन, Agrarian=कृषि-संबंधी, Agenda=कार्यसूची।' },

  { id: 'h042', topic: 'hi_terminology', skill: 'hi_to_en', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: "प्रशासनिक शब्द 'प्रतिनियुक्ति' के लिए उपयुक्त अंग्रेजी शब्द क्या होगा?",
    options: ['Implementation', 'Provision', 'Deputation', 'Declaration'],
    answer: 2, explain: 'प्रतिनियुक्ति = Deputation। Implementation=कार्यान्वयन, Provision=प्रावधान।' },

  { id: 'h043', topic: 'hi_terminology', skill: 'en_to_hi', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: "पारिभाषिक शब्द 'Cadre' का उपयुक्त हिंदी अर्थ क्या है?",
    options: ['एकमत', 'संवर्ग', 'सभा', 'पूँजी'],
    answer: 1, explain: 'Cadre = संवर्ग। एकमत=unanimous, सभा=assembly, पूँजी=capital।' },

  { id: 'h044', topic: 'hi_terminology', skill: 'en_to_hi', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: "'Per mensem' अभिव्यक्ति के लिए हिंदी में उपयुक्त शब्द क्या होगा?",
    options: ['प्रतिदिन', 'प्रतिशत', 'प्रतिमास', 'प्रतिमान'],
    answer: 2,
    explain: 'जाल: प्रतिमान = मानक/standard, ध्वन्यात्मक रूप से "mensem" जैसा पर गलत। mensem = लैटिन में "माह" → प्रतिमास।' },

  { id: 'h045', topic: 'hi_terminology', skill: 'register', difficulty: 4, lang: 'hi', source: 'AUTHORED',
    stem: '"तदनुसार कार्यवाही की जाए" — यह वाक्यांश किस प्रकार का निर्देश है?',
    options: ['टालने योग्य', 'कालान्तरित', 'परामर्शात्मक', 'बाध्यकारी कार्यान्वयन'],
    answer: 3,
    explain: 'जाल: परामर्शात्मक (advisory)। सरकारी भाषा में "तदनुसार कार्यवाही की जाए" = अनिवार्य/बाध्यकारी, सलाह नहीं।' },

  // =====================================================================
  // HINDI — पद परिचय (parts of speech identification; includes dual-answer trap)
  // =====================================================================
  { id: 'h050', topic: 'hi_pada_parichay', skill: 'dual', difficulty: 5, lang: 'hi', source: 'AUTHORED',
    stem: '"दादी जी रोज सुबह मंदिर जाती हैं" — क्रिया का प्रकार और क्रिया विशेषण का प्रकार पहचानें।',
    options: ['अकर्मक क्रिया, स्थानवाचक क्रिया विशेषण', 'सकर्मक क्रिया, स्थानवाचक क्रिया विशेषण', 'अकर्मक क्रिया, कालवाचक क्रिया विशेषण', 'सकर्मक क्रिया, कालवाचक क्रिया विशेषण'],
    answer: 2,
    explain: 'जाल: "मंदिर" दिखता है कर्म पर वास्तव में दिशा/गंतव्य है → कर्म नहीं। जाना = अकर्मक; "रोज सुबह" = कालवाचक (समय)। द्वैत-उत्तर प्रारूप = सबसे कठिन।' },

  { id: 'h051', topic: 'hi_pada_parichay', skill: 'verb_type', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: '"सूर्य उदय होता है" — इस वाक्य में "उदय होता है" क्रिया का प्रकार बताइए।',
    options: ['द्विकर्मक क्रिया', 'प्रेरणार्थक क्रिया', 'सकर्मक क्रिया', 'अकर्मक क्रिया'],
    answer: 3, explain: 'कर्म नहीं है → अकर्मक क्रिया।' },

  { id: 'h052', topic: 'hi_pada_parichay', skill: 'karak', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: '"माँ ने बच्चे को कहानी सुनाई" — इसमें "बच्चे को" कौन-सा कारक है?',
    options: ['कर्ता', 'अपादान', 'कर्म', 'संबोधन'],
    answer: 2, explain: 'बच्चे को = कहानी सुनाई का कर्म (object)।' },

  { id: 'h053', topic: 'hi_pada_parichay', skill: 'adverb', difficulty: 2, lang: 'hi', source: 'AUTHORED',
    stem: '"वह धीरे-धीरे चलता है" — "धीरे-धीरे" कौन-सा क्रिया विशेषण है?',
    options: ['स्थानवाचक', 'रीतिवाचक', 'कालवाचक', 'परिमाणवाचक'],
    answer: 1, explain: 'रीतिवाचक = बताता है कैसे (HOW)। धीरे-धीरे = चलने की रीति।' },

  // =====================================================================
  // HINDI — विराम चिन्ह (punctuation)
  // =====================================================================
  { id: 'h060', topic: 'hi_punctuation', skill: 'name', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: 'अपूर्णविराम का एक अन्य नाम क्या है?',
    options: ['अर्द्धविराम', 'अल्पविराम', 'उपविराम', 'पूर्णविराम'],
    answer: 2,
    explain: 'अपूर्णविराम (colon :) = उपविराम। अल्पविराम = comma (,), अर्द्धविराम = semicolon (;), पूर्णविराम = full stop (।)। नामकरण प्रारूप ≠ उपयोग प्रारूप।' },

  { id: 'h061', topic: 'hi_punctuation', skill: 'usage', difficulty: 2, lang: 'hi', source: 'AUTHORED',
    stem: '"तुम कैसे हो__" — रिक्त स्थान में उपयुक्त विराम चिन्ह है:',
    options: ['। (पूर्णविराम)', '? (प्रश्नवाचक)', '! (विस्मयादिबोधक)', ', (अल्पविराम)'],
    answer: 1, explain: 'प्रश्न है → प्रश्नवाचक चिह्न (?)।' },

  { id: 'h062', topic: 'hi_punctuation', skill: 'double', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: '"वाह! क्या सुंदर दृश्य है__" — वाक्य के अंत में उपयुक्त विराम चिन्ह है:',
    options: ['। (पूर्णविराम)', '! (विस्मयादिबोधक)', '. (पूर्णविराम)', '? (प्रश्नवाचक)'],
    answer: 1, explain: 'विस्मयसूचक भाव अंत तक बना रहता है → अंत में भी !। । भाव को नहीं रखता।' },

  { id: 'h063', topic: 'hi_punctuation', skill: 'usage', difficulty: 4, lang: 'hi', source: 'AUTHORED',
    stem: 'जब किसी पद की व्याख्या करनी हो, तब किस चिन्ह का प्रयोग होता है?',
    options: ['योजक चिन्ह', 'विवरण चिन्ह (:)', 'निर्देशन चिन्ह', 'उद्धरण चिह्न'],
    answer: 1, explain: 'विवरण-चिह्न (colon) = व्याख्या या सूची प्रस्तुत करता है। उद्धरण चिह्न = अन्य उद्देश्य।' },

  // =====================================================================
  // HINDI — पूर्वाग्रह-मुक्त भाषा (bias-free language)
  // =====================================================================
  { id: 'h070', topic: 'hi_bias_free', skill: 'rewrite', difficulty: 4, lang: 'hi', source: 'AUTHORED',
    stem: '"उनकी भाषा बहुत पिछड़ी हुई है" — इसका पूर्वाग्रह-मुक्त विकल्प चुनिए।',
    options: ['उनकी भाषा तो गड़बड़ है', 'उनकी भाषा की संरचना अलग है, समझने की आवश्यकता है', 'वो तो अनपढ़ों की भाषा है', 'गाँव वाले ऐसी ही बोलते हैं'],
    answer: 1,
    explain: 'नियम: मूल्य-निर्णय (पिछड़ी=backward) हटाओ, वर्णनात्मक भाषा (संरचना अलग) रखो।' },

  { id: 'h071', topic: 'hi_bias_free', skill: 'content_preserve', difficulty: 5, lang: 'hi', source: 'AUTHORED',
    stem: '"हमने नौकरों को निर्देश दिए" — इसका पूर्वाग्रह-मुक्त विकल्प क्या हो सकता है?',
    options: ['हमने घरेलू सहायकों को निर्देश दिए', 'हमने सेवकों को आदेश दिए', 'हमने कार्यकर्ताओं को तैनात किया', 'हमने मजदूरों को समझाया'],
    answer: 0,
    explain: 'नियम: केवल रजिस्टर/लेबल बदलो, क्रिया नहीं। "तैनात" ≠ "निर्देश", "समझाया" ≠ "निर्देश"। केवल पहला विकल्प क्रिया सुरक्षित रखता है।' },

  { id: 'h072', topic: 'hi_bias_free', skill: 'rewrite', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: '"पुस्तक गूँगे-बहरे के लिए नहीं थी" — इसे पूर्वग्रह-मुक्त कैसे बनाया जाए?',
    options: ['पुस्तक विशेष योग्यताओं के अनुसार बनाई गई थी', 'पुस्तक सभी के लिए सुलभ नहीं थी', 'वह किताब कुछ खास लोगों के लिए थी', 'यह किताब केवल सुनने वालों के लिए थी'],
    answer: 1, explain: 'सुलभता-ढांचा (accessibility framing) अपमानजनक लेबल हटाता है।' },

  // =====================================================================
  // HINDI — वर्तनी, आर्थिक, स्थानीयकरण, सूक्ष्म अर्थ, मुहावरे, व्यंग्य
  // =====================================================================
  { id: 'h080', topic: 'hi_spelling', skill: 'identify', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: 'निम्न में से कौन-सा एक शब्द शुद्ध है?',
    options: ['प्राय', 'निश्काम', 'निष्काम', 'अस्क'],
    answer: 2, explain: 'निष्काम (विसर्ग का ष हो जाता है क से पहले)। प्राय → प्रायः।' },

  { id: 'h081', topic: 'hi_spelling', skill: 'insentence', difficulty: 4, lang: 'hi', source: 'AUTHORED',
    stem: 'किस वाक्य में शुद्ध वर्तनी वाले शब्द का प्रयोग हुआ है?',
    options: ['मौर्य सामराज्य का विस्तार बहुत बड़ा था', 'प्रसिद्ध कवित्री ने अपनी नवीनतम रचना सुनाई', 'देश के आर्थिक पुनरुत्थान के लिए नए प्रयास किए जा रहे हैं', 'भारतीय साहित्य में प्राचीन वाङ्मय का विशेष स्थान है'],
    answer: 2, explain: 'अन्य त्रुटियाँ: सामराज→साम्राज्य, कवित्री→कवयित्री, वांगमय→वाङ्मय।' },

  { id: 'h082', topic: 'hi_economic', skill: 'definition', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: "अर्थशास्त्र में 'मांग' शब्द का विशेष अर्थ क्या है?",
    options: ['आवश्यकता', 'वस्तु की कमी', 'केवल इच्छा', 'किसी वस्तु को खरीदने की इच्छा, क्षमता और तत्परता'],
    answer: 3,
    explain: 'नियम: आर्थिक मांग = इच्छा + भुगतान क्षमता + तत्परता। केवल इच्छा अपूर्ण है।' },

  { id: 'h083', topic: 'hi_localization', skill: 'violate', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: 'कौन-सा वाक्य स्थानीयकरण की भावना के विपरीत है?',
    options: ['वह रेलगाड़ी से सफर करता है', 'उसने ट्रेन की टिकट ली और ट्रेन पकड़ी', 'उसने लोकल से यात्रा की', 'उसने टिकट लिया और रेलगाड़ी में चढ़ा'],
    answer: 2,
    explain: '"लोकल" = हिंदी वाक्य में अंग्रेज़ी शब्द = स्थानीयकरण उल्लंघन। ट्रेन पूर्णतः स्वीकृत ऋणशब्द है।' },

  { id: 'h084', topic: 'hi_localization', skill: 'unnatural', difficulty: 4, lang: 'hi', source: 'AUTHORED',
    stem: "'मुझे चाय पीने का मन कर रहा है' — इसका कौन-सा रूपांतरण सबसे अस्वाभाविक है?",
    options: ['मुझे चाय पीने का मनोभाव हो रहा है', 'मुझे चाय पीने की इच्छा हो रही है', 'मुझे चाय पीने का मन है', 'मुझे चाय पीने का जी कर रहा है'],
    answer: 0, explain: 'मनोभाव = नैदानिक मनोवैज्ञानिक शब्द, सामान्य इच्छा के लिए = रजिस्टर बेमेल।' },

  { id: 'h085', topic: 'hi_multimeaning', skill: 'subtle', difficulty: 5, lang: 'hi', source: 'AUTHORED',
    stem: "'काल' शब्द का एक अर्थ 'समय' है। इसका एक सूक्ष्म अर्थ है:",
    options: ['मृत्यु', 'भूत', 'वर्तमान', 'भविष्य'],
    answer: 0,
    explain: 'जाल: भूत = काल का वास्तविक अर्थ (अतीत समय), पर यह कालिक है। सबसे सूक्ष्म/दुर्लभ अर्थ = मृत्यु ("काल का ग्रास")।' },

  { id: 'h086', topic: 'hi_idiom', skill: 'meaning', difficulty: 3, lang: 'hi', source: 'AUTHORED',
    stem: "'कुआँ खुदवा के मेंढक पकड़ना' मुहावरे का सही अर्थ क्या है?",
    options: ['अनजाने में किसी समस्या को बढ़ा देना', 'छोटे काम के लिए बड़ी तैयारी करना', 'अत्यधिक प्रयास करके नगण्य परिणाम प्राप्त करना', 'कुआँ खोदकर मेंढक पकड़ना'],
    answer: 2, explain: 'जाल: "छोटे काम के लिए बड़ी तैयारी" — समान पर "नगण्य परिणाम" तत्व नहीं।' },

  { id: 'h087', topic: 'hi_figure', skill: 'not_x', difficulty: 5, lang: 'hi', source: 'AUTHORED',
    stem: '"अब तो इम्तिहान में भी किस्मत पास हो जाती है, मेहनत नहीं" — इस कथन का व्यंग्यार्थ निम्न में से कौन-सा नहीं है?',
    options: ['किस्मत ही असफल होने का कारण है', 'आजकल सफलता में संयोग की भूमिका बढ़ी है', 'परिश्रम का महत्व घटता जा रहा है', 'अब मेहनत से ज्यादा जुगाड़ काम आता है'],
    answer: 0,
    explain: 'सबसे कठिन प्रारूप। व्यंग्य कहता है किस्मत = सफलता का कारण; यह विकल्प उल्टा करता है (असफलता)। शेष तीन वैध व्यंग्यार्थ हैं।' },

  { id: 'h088', topic: 'hi_meaning', skill: 'identify', difficulty: 2, lang: 'hi', source: 'AUTHORED',
    stem: "'अक्षय' का अर्थ क्या है?",
    options: ['कमज़ोर', 'असीमित/अविनाशी', 'समाप्त', 'सीमित'],
    answer: 1, explain: 'अक्षय = जो क्षय न हो = असीमित/अविनाशी।' },

  { id: 'h089', topic: 'hi_jati_bhav', skill: 'not_x', difficulty: 4, lang: 'hi', source: 'AUTHORED',
    stem: 'इनमें से कौन-सा शब्द जातिवाचक से बनी भाववाचक संज्ञा नहीं है?',
    options: ['दयालुता', 'मित्रता', 'शिक्षक', 'सुंदरता'],
    answer: 2, explain: 'शिक्षक = स्वयं एक जातिवाचक संज्ञा (व्यक्ति), भाववाचक नहीं। शेष "-ता" प्रत्यय से भाववाचक बने।' },

  // =====================================================================
  // ENGLISH — IDIOMS
  // =====================================================================
  { id: 'e001', topic: 'en_idiom', skill: 'meaning', difficulty: 2, lang: 'en', source: 'AUTHORED',
    stem: 'What does the idiom "to keep the wolf away from the door" mean?',
    options: ['To escape from a dangerous situation', 'To protect oneself from enemies', 'To avoid financial hardship', 'To stay away from risky opportunities'],
    answer: 2, explain: 'TRAP: "protect from enemies" — literal wolf reading. The idiom means to have enough money to avoid poverty/hunger.' },

  { id: 'e002', topic: 'en_idiom', skill: 'meaning', difficulty: 2, lang: 'en', source: 'AUTHORED',
    stem: '"Leave no stone unturned" means:',
    options: ['to be lazy', 'to search everywhere / do everything possible', 'to build a house', 'to give up easily'],
    answer: 1, explain: 'To try every possible course of action to achieve something.' },

  { id: 'e003', topic: 'en_idiom', skill: 'meaning', difficulty: 2, lang: 'en', source: 'AUTHORED',
    stem: '"Catch forty winks" means:',
    options: ['to count money', 'to take a short nap', 'to blink rapidly', 'to wait forty minutes'],
    answer: 1, explain: 'Forty winks = a brief sleep / nap.' },

  { id: 'e004', topic: 'en_idiom', skill: 'meaning', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: '"They were left in the lurch" means they were:',
    options: ['promoted quickly', 'abandoned in a difficult situation without help', 'given a warm welcome', 'sent to a quiet place'],
    answer: 1, explain: 'To leave someone in the lurch = to abandon them when they need support.' },

  // =====================================================================
  // ENGLISH — SYNONYMS (with antonym-as-distractor trap)
  // =====================================================================
  { id: 'e010', topic: 'en_synonym', skill: 'antonym_trap', difficulty: 5, lang: 'en', source: 'AUTHORED',
    stem: 'Choose the synonym of PERFUNCTORY.',
    options: ['Cursory', 'Earnest', 'Diligent', 'Thorough'],
    answer: 0,
    explain: 'TRAP: Earnest = ANTONYM (sincere/serious). This is the only paper question where students pick the antonym thinking it is the synonym.' },

  { id: 'e011', topic: 'en_synonym', skill: 'advanced', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'Choose the synonym of PROCLIVITY.',
    options: ['Impulse', 'Tendency', 'Reluctance', 'Aversion'],
    answer: 1,
    explain: 'TRAP: Impulse = sudden urge; proclivity = gradual natural inclination (different temporal aspect).' },

  { id: 'e012', topic: 'en_synonym', skill: 'advanced', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'Choose the synonym of INTRANSIGENT.',
    options: ['Stubborn', 'Unyielding', 'Flexible', 'Yielding'],
    answer: 1,
    explain: 'TRAP: Stubborn (general obstinacy, casual) vs Unyielding (specifically refusing to compromise, formal/precise). Both work but unyielding is most precise.' },

  { id: 'e013', topic: 'en_synonym', skill: 'advanced', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Choose the synonym of MALEDICTION.',
    options: ['Blessing', 'Curse', 'Praise', 'Speech'],
    answer: 1, explain: 'mal (bad) + diction (speaking) = curse.' },

  // =====================================================================
  // ENGLISH — ANTONYMS
  // =====================================================================
  { id: 'e020', topic: 'en_antonym', skill: 'advanced', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Choose the antonym of IMPERVIOUS.',
    options: ['Permeable', 'Impassive', 'Impregnable', 'Impervious'],
    answer: 0,
    explain: 'TRAP: Impassive (emotionally unaffected — sounds similar), Impregnable (cannot be captured). Impervious = not allowing passage; antonym = Permeable.' },

  { id: 'e021', topic: 'en_antonym', skill: 'advanced', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Choose the antonym of LUCID.',
    options: ['Fluent', 'Clear', 'Confusing', 'Bright'],
    answer: 2, explain: 'TRAP: Fluent, Clear, Bright are all SYNONYMS of lucid, not antonyms.' },

  { id: 'e022', topic: 'en_antonym', skill: 'common', difficulty: 2, lang: 'en', source: 'AUTHORED',
    stem: 'Choose the antonym of VIGILANT.',
    options: ['Alert', 'Watchful', 'Negligent', 'Careful'],
    answer: 2, explain: 'Vigilant = watchful; antonym = negligent (inattentive).' },

  { id: 'e023', topic: 'en_antonym', skill: 'common', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Choose the antonym of SHRUGGED (as in "shrugged off").',
    options: ['Dismissed', 'Ignored', 'Embraced', 'Rejected'],
    answer: 2, explain: 'Shrugged = dismissed/showed indifference; Embraced = accepted warmly = opposite.' },

  // =====================================================================
  // ENGLISH — ONE-WORD SUBSTITUTION (fine distinctions)
  // =====================================================================
  { id: 'e030', topic: 'en_oneword', skill: 'age', difficulty: 5, lang: 'en', source: 'AUTHORED',
    stem: 'One word for: "In extreme old age when a person behaves like a fool."',
    options: ['Imbecility', 'Senescence', 'Superannuation', 'Dotage'],
    answer: 3,
    explain: 'Only Dotage = BOTH old age + foolish behavior. Senescence = aging only; Imbecility = foolishness only; Superannuation = retirement only.' },

  { id: 'e031', topic: 'en_oneword', skill: 'medical', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'One word for: "A disease communicable through DIRECT CONTACT."',
    options: ['Infectious', 'Contagious', 'Epidemic', 'Endemic'],
    answer: 1,
    explain: 'Infectious = spreads by ANY route (broader). Contagious = SPECIFICALLY by direct contact (narrower) = correct.' },

  { id: 'e032', topic: 'en_oneword', skill: 'person', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'One word for: "Imitating a PERSON\'s speech and mannerisms for entertainment or ridicule."',
    options: ['Parody', 'Satire', 'Imitation', 'Mimicry'],
    answer: 3,
    explain: 'Mimicry = imitating a PERSON. Parody = imitating a WORK (book/film style). Satire = broader irony. Imitation = general copying.' },

  { id: 'e033', topic: 'en_oneword', skill: 'person', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'One word for: "An expert judge of fine wines and food."',
    options: ['Amateur', 'Connoisseur', 'Spectator', 'Novice'],
    answer: 1, explain: 'Connoisseur = expert. Others are beginners/watchers.' },

  // =====================================================================
  // ENGLISH — SPELLINGS (with the Supersede rule)
  // =====================================================================
  { id: 'e040', topic: 'en_spelling', skill: 'identify_correct', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'Which is the correct spelling?',
    options: ['Supercede', 'Supersede', 'Superceed', 'Superscede'],
    answer: 1,
    explain: 'Supersede = the ONLY English word ending in -sede (Latin "supersedere"). All others end -cede (precede, exceed). Supercede is the most common misspelling in government documents.' },

  { id: 'e041', topic: 'en_spelling', skill: 'identify_correct', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Which is the correct spelling?',
    options: ['Aesthetic', 'Aesthathettic', 'Easthetic', 'Aesthatic'],
    answer: 0, explain: 'Aesthetic (relating to beauty).' },

  { id: 'e042', topic: 'en_spelling', skill: 'identify_wrong', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Which is INCORRECTLY spelled?',
    options: ['Obsolescence', 'Obsolesence', 'Resilience', 'Persistence'],
    answer: 1, explain: 'Obsolescence (needs the "sc"). Obsolesence is missing the second "c".' },

  { id: 'e043', topic: 'en_spelling', skill: 'fill_blank', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Fill the blank with the correctly spelt word: "A ___ ruler has absolute power."',
    options: ['despotic', 'despotick', 'desppotic', 'disspotic'],
    answer: 0, explain: 'despotic.' },

  // =====================================================================
  // ENGLISH — ARTICLES
  // =====================================================================
  { id: 'e050', topic: 'en_article', skill: 'definite', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Fill in: "___ enigmatic dodo of Mauritius was flightless."',
    options: ['The', 'An', 'A', 'No article'],
    answer: 0,
    explain: 'TRAP: An (because "enigmatic" starts with vowel sound). But dodo = the specific, unique famous bird = definite article "The".' },

  { id: 'e051', topic: 'en_article', skill: 'zero', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'Fill in: "There was scarcely ___ hope left."',
    options: ['a', 'the', 'no article', 'an'],
    answer: 2,
    explain: 'TRAP: "a" (most common error). scarcely/hardly/barely = negative adverbs; "a hope" implies some exists, contradicting scarcely.' },

  { id: 'e052', topic: 'en_article', skill: 'double_blank', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'Fill: "While ___ majority agreed, only ___ handful objected."',
    options: ['the, the', 'the, a', 'a, a', 'a, the'],
    answer: 1,
    explain: 'TRAP: "the, the". "the majority" = specific group; "a handful" = indefinite quantity, not specific.' },

  // =====================================================================
  // ENGLISH — COMMON ERRORS (superlatives/double comparatives)
  // =====================================================================
  { id: 'e060', topic: 'en_error', skill: 'superlative', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Spot the error: "Of the three runners, he was the faster."',
    options: ['the', 'faster → fastest', 'Of', 'three'],
    answer: 1, explain: 'For 3+ items use superlative (fastest), not comparative (faster).' },

  { id: 'e061', topic: 'en_error', skill: 'double_comp', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Spot the error: "This is the most highest peak."',
    options: ['This', 'the', 'most', 'peak'],
    answer: 2, explain: 'Double superlative: "most highest" → "highest". Never use "most" with -est.' },

  { id: 'e062', topic: 'en_error', skill: 'degree', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Spot the error: "The room was more hot than comfortable."',
    options: ['was', 'more → hotter', 'than', 'comfortable'],
    answer: 1,
    explain: 'TRAP: students pick "not"-style words. The real error: one-syllable adjective "hot" takes -er, not "more".' },

  // =====================================================================
  // ENGLISH — SENTENCE IMPROVEMENT (tense focus — biggest trap area)
  // =====================================================================
  { id: 'e070', topic: 'en_improvement', skill: 'past_continuous', difficulty: 5, lang: 'en', source: 'AUTHORED',
    stem: 'Improve: "He [work] for an hour when I found him sleeping."',
    options: ['had worked', 'was working', 'has worked', 'worked'],
    answer: 1,
    explain: 'MOST IMPORTANT TRAP: "had worked" (past perfect) = COMPLETED before finding. But he was STILL sleeping when found → action was IN PROGRESS = was working (past continuous).' },

  { id: 'e071', topic: 'en_improvement', skill: 'future_perfect', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Improve: "By the time you arrive, I [finish] the work."',
    options: ['will finish', 'will have finished', 'finished', 'am finishing'],
    answer: 1, explain: '"By the time" + future action = future perfect (will have finished).' },

  { id: 'e072', topic: 'en_improvement', skill: 'past_perfect', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'Improve: "She said that she [complete] the report before the deadline."',
    options: ['will complete', 'had completed', 'completes', 'has completed'],
    answer: 1, explain: '"said that...before" = past action completed before another past action = past perfect (had completed).' },

  // =====================================================================
  // ENGLISH — VOICE (active/passive; includes complex stacked)
  // =====================================================================
  { id: 'e080', topic: 'en_voice', skill: 'simple', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Change to passive: "Mr. Sam teaches us geometry."',
    options: ['Geometry is taught to us by Mr. Sam', 'We are teaching geometry', 'Geometry teaches us', 'Mr. Sam is taught geometry'],
    answer: 0, explain: 'Simple present passive: is + taught + to us by Mr. Sam.' },

  { id: 'e081', topic: 'en_voice', skill: 'modal', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'Change to active: "The laptop may not be bought by her."',
    options: ['She might not buy the laptop', 'She may not buy the laptop', 'She will not buy', 'She does not buy'],
    answer: 1, explain: 'TRAP: don\'t change the modal. "may" stays "may", not "might".' },

  { id: 'e082', topic: 'en_voice', skill: 'continuous', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'Change to passive: "The teacher was giving detailed instructions."',
    options: ['Detailed instructions were being given', 'Detailed instructions are given', 'Detailed instructions gave', 'Detailed instructions had given'],
    answer: 0, explain: 'Past continuous passive: was/were + being + past participle.' },

  { id: 'e083', topic: 'en_voice', skill: 'infinitive', difficulty: 5, lang: 'en', source: 'AUTHORED',
    stem: 'Change to passive: "Someone was to have reviewed the file."',
    options: ['was to were been reviewed', 'was to have been reviewed', 'was reviewed', 'is to review'],
    answer: 1,
    explain: 'Perfect infinitive passive: was to + have been + past participle. "was to were been" is grammatically impossible.' },

  // =====================================================================
  // ENGLISH — NARRATION (direct/indirect)
  // =====================================================================
  { id: 'e090', topic: 'en_narration', skill: 'indirect_to_direct', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'Change to direct: "He asked me if I had done my practical."',
    options: ['He said, "Had I done your practical?"', 'He said, "Have you done your practical?"', 'He said, "Do your practical"', 'He said, "I have done practical"'],
    answer: 1,
    explain: 'RULE: When converting indirect→direct, REVERSE the backshift: "had done" → "have done". Pronoun: "I"→"you".' },

  { id: 'e091', topic: 'en_narration', skill: 'direct_to_indirect', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'Change to indirect: "Why don\'t we check with Mrinmay?" she said.',
    options: ['She suggested to check with Mrinmay', 'She suggested checking with Mrinmay', 'She suggested checked with Mrinmay', 'She suggested to checking'],
    answer: 1,
    explain: 'SUGGEST + GERUND rule: suggest/recommend/consider/avoid = always + V+ing. "suggest to do" is grammatically wrong.' },

  { id: 'e092', topic: 'en_narration', skill: 'exclamatory', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'Change to indirect: "Bravo! I have passed," said Purna.',
    options: ['Purna expressed with excitement that she had passed', 'Purna joyfully exclaimed that she had passed', 'Purna announced that she passed', 'Purna told she passed'],
    answer: 1,
    explain: 'Exclamatory → must include emotion adverb (joyfully exclaimed). "expressed with excitement" is incomplete; "announced" is wrong for exclamatory speech.' },

  // =====================================================================
  // ENGLISH — GRAMMAR IN CONTEXT (sentence type, participle vs gerund)
  // =====================================================================
  { id: 'e100', topic: 'en_grammar', skill: 'sentence_type', difficulty: 5, lang: 'en', source: 'AUTHORED',
    stem: 'Identify the sentence type: "The connection implies that time is relative."',
    options: ['Simple', 'Compound', 'Complex', 'Compound-Complex'],
    answer: 2,
    explain: 'TRAP: Compound-Complex (hardest distractor). Rule: ONE main clause ("connection implies") + ONE subordinate noun clause ("that time is relative") = Complex only. Compound-Complex needs TWO independent clauses.' },

  { id: 'e101', topic: 'en_grammar', skill: 'participle', difficulty: 5, lang: 'en', source: 'AUTHORED',
    stem: 'In "Objects moving within this field follow geodesics," the word "moving" is:',
    options: ['Gerund', 'Present participle acting as adjective', 'Main verb', 'Noun'],
    answer: 1,
    explain: 'TRAP: Gerund (because of -ing). RULE: Gerund = NOUN (subject/object); here "moving" MODIFIES "objects" (which objects? those moving) = participial adjective.' },

  // =====================================================================
  // ENGLISH — HOMONYMS (not-a-meaning format with similar-word trap)
  // =====================================================================
  { id: 'e110', topic: 'en_homonym', skill: 'not_meaning', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'Which is NOT a meaning of REGISTER?',
    options: ['To show emotion on the face', 'To enroll officially', 'A medieval musical instrument', 'A cash-machine record'],
    answer: 2, explain: 'The medieval instrument = RECORDER, a different word. Real meanings: facial expression, enrollment, cash record.' },

  { id: 'e111', topic: 'en_homonym', skill: 'not_meaning', difficulty: 4, lang: 'en', source: 'AUTHORED',
    stem: 'Which is NOT a meaning of PRECIPITATE?',
    options: ['To make happen suddenly', 'A chemical solid formed from solution', 'A steep or abrupt cliff', 'To fall/drop suddenly'],
    answer: 2, explain: 'A steep cliff = PRECIPICE (near-homophone, different word). Real meanings of precipitate: sudden cause, chemical solid, sudden fall.' },

  { id: 'e112', topic: 'en_homonym', skill: 'homophone', difficulty: 3, lang: 'en', source: 'AUTHORED',
    stem: 'The homophone of FLOUR is:',
    options: ['Floor', 'Flower', 'Flair', 'Flyer'],
    answer: 1, explain: 'TRAP: Floor (/flɔːr/ — different vowel). Flour/Flower = /flaʊər/ (same).' },
];

export const questionById = (id) => QUESTIONS.find(q => q.id === id);
export const questionsByTopic = (tid) => QUESTIONS.filter(q => q.topic === tid);
export const questionsBySubject = (subj) =>
  QUESTIONS.filter(q => topicById(q.topic)?.subject === subj);
