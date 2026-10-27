import { load } from 'cheerio';
import { categories, countries, specificCategories, type SpecificCategory } from '../catalog';
import type { SearchInput, SearchResult } from '../types';
import { normalizeUrl } from './safe-fetch';

export class SearchError extends Error {
  constructor(message: string, public code: string, public status = 503) { super(message); this.name = 'SearchError'; }
}

type SearchLanguage = 'es' | 'en' | 'pt' | 'fr' | 'de' | 'it' | 'nl' | 'ja' | 'zh' | 'ko' | 'ar' | 'hi';

const sectorTerms: Record<SpecificCategory, Record<SearchLanguage, string[]>> = {
  'Lectura, libros y novelas': {
    es: ['leer novelas online', 'biblioteca digital libros', 'plataforma relatos escritores', 'audiolibros poesía literatura'],
    en: ['read web novels online', 'digital library books', 'fiction writing platform', 'audiobooks poetry literature'],
    pt: ['ler romances online', 'biblioteca digital livros', 'plataforma contos escritores', 'audiolivros poesia literatura'],
    fr: ['lire romans en ligne', 'bibliothèque numérique livres', 'plateforme écriture récits', 'livres audio poésie'],
    de: ['Webromane online lesen', 'digitale Bibliothek Bücher', 'Schreibplattform Geschichten', 'Hörbücher Lyrik Literatur'],
    it: ['leggere romanzi online', 'biblioteca digitale libri', 'piattaforma racconti scrittori', 'audiolibri poesia letteratura'],
    nl: ['romans online lezen', 'digitale bibliotheek boeken', 'schrijfplatform verhalen', 'luisterboeken poëzie literatuur'],
    ja: ['小説投稿サイト', '電子図書館 電子書籍', '創作小説 読書サイト', 'オーディオブック 文学'],
    zh: ['网络小说 阅读平台', '数字图书馆 电子书', '原创文学 投稿平台', '有声书 诗歌文学'],
    ko: ['웹소설 읽기 플랫폼', '전자도서관 전자책', '창작 소설 연재 사이트', '오디오북 시 문학'],
    ar: ['قراءة روايات أونلاين', 'مكتبة كتب إلكترونية', 'منصة قصص وكتابة', 'كتب صوتية شعر وأدب'],
    hi: ['उपन्यास ऑनलाइन पढ़ें', 'डिजिटल पुस्तकालय ईबुक', 'कहानी लेखन मंच', 'ऑडियोबुक कविता साहित्य'],
  },
  'Foros y comunidades': {
    es: ['foro comunidad online', 'comunidad aficionados fotografía', 'foro soporte tecnología', 'club lectores red social independiente'],
    en: ['independent online forum', 'photography hobby community', 'technology support forum', 'book club social network'],
    pt: ['fórum comunidade online', 'comunidade fotografia hobbies', 'fórum suporte tecnologia', 'clube de leitura rede social'],
    fr: ['forum communauté en ligne', 'communauté photographie loisirs', 'forum entraide informatique', 'club lecture réseau social'],
    de: ['Online Forum Community', 'Fotografie Hobby Forum', 'Technik Support Forum', 'Leseclub soziales Netzwerk'],
    it: ['forum comunità online', 'comunità fotografia hobby', 'forum assistenza tecnologia', 'club lettura rete sociale'],
    nl: ['online forum gemeenschap', 'fotografie hobby forum', 'technologie hulp forum', 'leesclub sociaal netwerk'],
    ja: ['オンライン掲示板 コミュニティ', '写真 趣味 コミュニティ', '技術 質問 フォーラム', '読書会 SNS'],
    zh: ['在线论坛 社区', '摄影爱好者 社区', '技术交流 论坛', '读书会 社交平台'],
    ko: ['온라인 포럼 커뮤니티', '사진 취미 커뮤니티', '기술 지원 포럼', '독서 모임 소셜 플랫폼'],
    ar: ['منتدى مجتمع أونلاين', 'مجتمع هواة التصوير', 'منتدى دعم تقني', 'نادي قراءة شبكة اجتماعية'],
    hi: ['ऑनलाइन फोरम समुदाय', 'फोटोग्राफी शौक समुदाय', 'तकनीकी सहायता फोरम', 'बुक क्लब सोशल नेटवर्क'],
  },
  'Marketplaces y clasificados': {
    es: ['marketplace independiente', 'portal anuncios clasificados', 'plataforma artesanos segunda mano', 'comparador productos servicios'],
    en: ['independent marketplace', 'classified ads website', 'handmade secondhand platform', 'product service comparison website'],
    pt: ['marketplace independente', 'portal anúncios classificados', 'plataforma artesanato usados', 'comparador produtos serviços'],
    fr: ['place de marché indépendante', 'site petites annonces', 'plateforme artisanat occasion', 'comparateur produits services'],
    de: ['unabhängiger Marktplatz', 'Kleinanzeigen Portal', 'Handarbeit Gebrauchtwaren Plattform', 'Produktvergleich Dienstleistungen'],
    it: ['marketplace indipendente', 'portale annunci', 'piattaforma artigianato usato', 'comparatore prodotti servizi'],
    nl: ['onafhankelijke marktplaats', 'advertentie website', 'handgemaakt tweedehands platform', 'producten diensten vergelijken'],
    ja: ['独立 マーケットプレイス', 'クラシファイド 広告サイト', 'ハンドメイド 中古 売買', '商品 サービス 比較サイト'],
    zh: ['独立交易平台', '分类信息 网站', '手工艺 二手交易平台', '商品服务 比较网站'],
    ko: ['독립 마켓플레이스', '생활정보 광고 사이트', '수공예 중고거래 플랫폼', '상품 서비스 비교 사이트'],
    ar: ['سوق إلكتروني مستقل', 'موقع إعلانات مبوبة', 'منصة حرف يدوية مستعمل', 'مقارنة منتجات وخدمات'],
    hi: ['स्वतंत्र ऑनलाइन मार्केटप्लेस', 'वर्गीकृत विज्ञापन वेबसाइट', 'हस्तशिल्प सेकंड हैंड प्लेटफ़ॉर्म', 'उत्पाद सेवा तुलना वेबसाइट'],
  },
  'Empleo y talento': {
    es: ['portal empleo trabajo', 'agencia selección personal', 'plataforma freelancers', 'bolsa prácticas profesionales'],
    en: ['job board careers', 'recruitment agency', 'freelancer platform', 'internship jobs portal'],
    pt: ['portal vagas emprego', 'agência recrutamento', 'plataforma freelancers', 'bolsa estágios'],
    fr: ['site offres emploi', 'cabinet recrutement', 'plateforme freelances', 'portail stages alternance'],
    de: ['Jobbörse Stellenangebote', 'Personalvermittlung', 'Freelancer Plattform', 'Praktikumsbörse'],
    it: ['portale offerte lavoro', 'agenzia selezione personale', 'piattaforma freelance', 'portale tirocini'],
    nl: ['vacaturebank banen', 'werving selectie bureau', 'freelance platform', 'stage vacatures'],
    ja: ['求人サイト 転職', '人材紹介会社', 'フリーランス 案件サイト', 'インターン 求人'],
    zh: ['招聘 求职网站', '人力资源 招聘公司', '自由职业 平台', '实习 招聘网站'],
    ko: ['채용 구인구직 사이트', '인재 채용 대행', '프리랜서 플랫폼', '인턴 채용 사이트'],
    ar: ['موقع وظائف وتوظيف', 'شركة توظيف موارد بشرية', 'منصة عمل حر', 'فرص تدريب مهني'],
    hi: ['जॉब पोर्टल नौकरी', 'भर्ती एजेंसी', 'फ्रीलांसर प्लेटफ़ॉर्म', 'इंटर्नशिप पोर्टल'],
  },
  'Finanzas y seguros': {
    es: ['corredor seguros', 'cooperativa ahorro crédito', 'plataforma pagos fintech', 'asesoría financiera'],
    en: ['insurance broker', 'credit union', 'fintech payments platform', 'financial advisory firm'],
    pt: ['corretora seguros', 'cooperativa crédito', 'plataforma pagamentos fintech', 'consultoria financeira'],
    fr: ['courtier assurances', 'coopérative crédit', 'plateforme paiement fintech', 'conseil financier'],
    de: ['Versicherungsmakler', 'Kreditgenossenschaft', 'Fintech Zahlungsplattform', 'Finanzberatung'],
    it: ['broker assicurazioni', 'cooperativa credito', 'piattaforma pagamenti fintech', 'consulenza finanziaria'],
    nl: ['verzekeringsadviseur', 'kredietunie', 'fintech betaalplatform', 'financieel adviesbureau'],
    ja: ['保険代理店', '信用組合', 'フィンテック 決済サービス', 'ファイナンシャルプランナー'],
    zh: ['保险经纪公司', '信用合作社', '金融科技 支付平台', '财务咨询公司'],
    ko: ['보험 대리점', '신용협동조합', '핀테크 결제 플랫폼', '재무 상담 회사'],
    ar: ['وسيط تأمين', 'تعاونية ائتمان', 'منصة دفع تقنية مالية', 'استشارات مالية'],
    hi: ['बीमा ब्रोकर', 'क्रेडिट कोऑपरेटिव', 'फिनटेक भुगतान प्लेटफ़ॉर्म', 'वित्तीय सलाहकार'],
  },
  'Industria, agro y logística': {
    es: ['fabricante industrial', 'cooperativa agrícola agroindustria', 'empresa logística transporte', 'proveedor maquinaria energía'],
    en: ['industrial manufacturer', 'agricultural cooperative agribusiness', 'logistics freight company', 'machinery energy supplier'],
    pt: ['fabricante industrial', 'cooperativa agrícola agronegócio', 'empresa logística transporte', 'fornecedor máquinas energia'],
    fr: ['fabricant industriel', 'coopérative agricole', 'entreprise logistique transport', 'fournisseur machines énergie'],
    de: ['Industrie Hersteller', 'Agrargenossenschaft', 'Logistik Spedition', 'Maschinen Energie Anbieter'],
    it: ['produttore industriale', 'cooperativa agricola', 'azienda logistica trasporti', 'fornitore macchinari energia'],
    nl: ['industriële fabrikant', 'landbouwcoöperatie', 'logistiek transportbedrijf', 'machines energie leverancier'],
    ja: ['工業 メーカー', '農業協同組合', '物流 運送会社', '機械 エネルギー 供給会社'],
    zh: ['工业制造商', '农业合作社', '物流运输公司', '机械能源 供应商'],
    ko: ['산업 제조업체', '농업 협동조합', '물류 운송업체', '기계 에너지 공급업체'],
    ar: ['مصنع صناعي', 'تعاونية زراعية', 'شركة نقل ولوجستيات', 'مورد معدات وطاقة'],
    hi: ['औद्योगिक निर्माता', 'कृषि सहकारी संस्था', 'लॉजिस्टिक्स परिवहन कंपनी', 'मशीनरी ऊर्जा आपूर्तिकर्ता'],
  },
  'Servicios digitales y SaaS': {
    es: ['plataforma SaaS', 'herramienta online', 'aplicación web', 'agencia marketing digital', 'hosting y dominios'],
    en: ['SaaS platform', 'online tool', 'web app', 'digital agency', 'web hosting'],
    pt: ['plataforma SaaS', 'ferramenta online', 'aplicativo web', 'agência digital', 'hospedagem web'],
    fr: ['plateforme SaaS', 'outil en ligne', 'application web', 'agence digitale', 'hébergement web'],
    de: ['SaaS Plattform', 'Online Tool', 'Webanwendung', 'Digitalagentur', 'Webhosting'],
    it: ['piattaforma SaaS', 'strumento online', 'applicazione web', 'agenzia digitale', 'hosting web'],
    nl: ['SaaS platform', 'online tool', 'webapplicatie', 'digitaal bureau', 'webhosting'],
    ja: ['SaaSサービス', 'オンラインツール', 'Webアプリ', 'Web制作会社', 'レンタルサーバー'],
    zh: ['SaaS平台', '在线工具', '网页应用', '数字营销机构', '网站托管'],
    ko: ['SaaS 플랫폼', '온라인 도구', '웹 애플리케이션', '디지털 에이전시', '웹호스팅'],
    ar: ['منصة سحابية', 'أداة أونلاين', 'تطبيق ويب', 'وكالة تسويق رقمي', 'استضافة مواقع'],
    hi: ['SaaS प्लेटफ़ॉर्म', 'ऑनलाइन टूल', 'वेब ऐप', 'डिजिटल एजेंसी', 'वेब होस्टिंग'],
  },
  'Servicios técnicos y hogar': {
    es: ['servicio técnico reparaciones', 'empresa de limpieza', 'mudanzas y transporte', 'imprenta y serigrafía', 'lavandería tintorería', 'cerrajería fontanería'],
    en: ['repair service', 'cleaning service', 'moving company', 'print shop', 'laundry service', 'plumbing locksmith'],
    pt: ['assistência técnica reparos', 'empresa de limpeza', 'mudanças e fretes', 'gráfica e estamparia', 'lavanderia', 'encanador chaveiro'],
    fr: ['service de réparation', 'entreprise de nettoyage', 'déménagement transport', 'imprimerie', 'blanchisserie pressing', 'plomberie serrurerie'],
    de: ['Reparaturservice', 'Reinigungsfirma', 'Umzugsunternehmen', 'Druckerei', 'Wäscherei', 'Sanitär Schlüsseldienst'],
    it: ['servizio riparazioni', 'impresa di pulizie', 'traslochi trasporti', 'tipografia stampa', 'lavanderia', 'idraulico fabbro'],
    nl: ['reparatieservice', 'schoonmaakbedrijf', 'verhuisbedrijf', 'drukkerij', 'wasserij stomerij', 'loodgieter slotenmaker'],
    ja: ['修理サービス', 'ハウスクリーニング', '引越し業者', '印刷会社', 'クリーニング店', '水道修理'],
    zh: ['维修服务', '保洁公司', '搬家公司', '印刷厂', '洗衣店', '家政服务'],
    ko: ['수리 서비스', '청소 업체', '이삿짐센터', '인쇄소', '세탁소', '설비 수리'],
    ar: ['خدمات صيانة وإصلاح', 'شركة تنظيف', 'نقل عفش', 'مطبعة', 'مغسلة ملابس', 'سباكة وصيانة منزلية'],
    hi: ['रिपेयर सर्विस', 'क्लीनिंग सर्विस', 'पैकर एंड मूवर्स', 'प्रिंटिंग प्रेस', 'लॉन्ड्री सर्विस', 'प्लंबिंग सर्विस'],
  },
  'Servicios profesionales': {
    es: ['estudios contables', 'abogados', 'arquitectos', 'consultora empresarial', 'veterinarias'],
    en: ['accounting firm', 'law firm', 'architect', 'business consulting', 'veterinary clinic'],
    pt: ['contabilidade', 'advogados', 'arquitetos', 'consultoria empresarial', 'clínica veterinária'],
    fr: ['cabinet comptable', 'avocat', 'architecte', 'conseil aux entreprises', 'clinique vétérinaire'],
    de: ['Steuerberater', 'Rechtsanwalt', 'Architekt', 'Unternehmensberatung', 'Tierarztpraxis'],
    it: ['commercialista', 'avvocato', 'architetto', 'consulenza aziendale', 'clinica veterinaria'],
    nl: ['accountantskantoor', 'advocatenkantoor', 'architect', 'adviesbureau', 'dierenkliniek'],
    ja: ['税理士事務所', '法律事務所', '建築設計', '経営コンサルティング', '動物病院'],
    zh: ['会计事务所', '律师事务所', '建筑设计', '企业咨询', '宠物医院'],
    ko: ['세무사', '법률사무소', '건축사', '경영 컨설팅', '동물병원'],
    ar: ['مكتب محاسبة', 'مكتب محاماة', 'مهندس معماري', 'استشارات أعمال', 'عيادة بيطرية'],
    hi: ['चार्टर्ड अकाउंटेंट', 'वकील', 'आर्किटेक्ट', 'बिजनेस कंसल्टेंसी', 'पशु चिकित्सालय'],
  },
  'Manga, anime y cómics': {
    es: ['leer manga online', 'lector de manga capítulos', 'webtoon cómics español', 'portal anime novelas ligeras', 'tienda manga anime coleccionables'],
    en: ['read manga online', 'manga reader chapters', 'webcomic comic portal', 'anime light novel site', 'manga comic shop'],
    pt: ['ler mangá online', 'leitor de mangás capítulos', 'webtoon quadrinhos online', 'portal anime light novel', 'loja de mangás anime'],
    fr: ['lire manga en ligne', 'scan manga chapitres', 'webtoon bande dessinée', 'portail anime light novel', 'boutique manga BD'],
    de: ['Manga online lesen', 'Webcomic Comic Portal', 'Anime Light Novel Seite', 'Manga Comic Shop'],
    it: ['leggere manga online', 'manga capitoli scan', 'webtoon fumetti online', 'portale anime light novel', 'fumetteria manga'],
    nl: ['manga online lezen', 'webcomic strips online', 'anime manga portaal', 'stripwinkel manga shop'],
    ja: ['WEB漫画 インディーズ', '同人誌 コミック サイト', 'ライトノベル 投稿サイト', 'アニメ ファンサイト'],
    zh: ['在线漫画 阅读', '条漫 原创漫画网站', '轻小说 动漫门户', '动漫周边商城'],
    ko: ['웹툰 만화 사이트', '인디 웹툰 플랫폼', '라이트노벨 애니메이션 포털', '만화 굿즈샵'],
    ar: ['مانجا مترجمة أونلاين', 'قراءة مانجا فصول', 'ويب تون كوميكس عربي', 'موقع أنمي وروايات خفيفة'],
    hi: ['मंगा ऑनलाइन पढ़ें', 'वेबटून कॉमिक्स साइट', 'एनीमे पोर्टल', 'कॉमिक्स स्टोर'],
  },
  'Videojuegos y comunidades': {
    es: ['servidor videojuegos comunidad', 'foro gaming clan esports', 'estudio videojuegos indie', 'wiki guía juegos online'],
    en: ['game server community', 'gaming forum esports team', 'indie game studio', 'online rpg server'],
    pt: ['servidor de jogos comunidade', 'fórum gamer esports', 'estúdio jogos indie', 'servidor rpg online'],
    fr: ['serveur de jeu communauté', 'forum gaming esport', 'studio jeu vidéo indé', 'serveur roleplay en ligne'],
    de: ['Gameserver Community', 'Gaming Forum Esport Clan', 'Indie Game Studio', 'Online Rollenspiel Server'],
    it: ['server di gioco community', 'forum gaming esport', 'studio giochi indie', 'portale videogiochi'],
    nl: ['gameserver community', 'gaming forum esport', 'indie game studio', 'online game portaal'],
    ja: ['インディーゲーム 制作', 'ゲーム攻略 コミュニティ', 'eスポーツ チーム', 'オンラインゲーム サーバー'],
    zh: ['独立游戏 工作室', '游戏社区 论坛', '电竞俱乐部', '游戏私服 门户'],
    ko: ['인디게임 스튜디오', '게임 커뮤니티 포털', 'e스포츠 구단', '온라인 게임 서버'],
    ar: ['مجتمع ألعاب سيرفر', 'منتدى ألعاب رياضات إلكترونية', 'استوديو ألعاب مستقلة', 'موقع ألعاب أونلاين'],
    hi: ['गेमिंग कम्युनिटी सर्वर', 'इंडि गेम स्टूडियो', 'ईस्पोर्ट्स टीम', 'ऑनलाइन गेम पोर्टल'],
  },
  'Entretenimiento y streaming': {
    es: ['radio online emisora', 'podcast productora musical', 'eventos conciertos entradas', 'cine independiente cartelera', 'sello discográfico'],
    en: ['online radio station', 'podcast network music label', 'live events ticketing', 'indie cinema theater'],
    pt: ['rádio online emissora', 'produtora podcast música', 'eventos shows ingressos', 'cinema independente teatro'],
    fr: ['radio en ligne webradio', 'label musical podcast', 'billetterie événements concerts', 'cinéma indépendant théâtre'],
    de: ['Webradio Radiosender', 'Podcast Musiklabel', 'Veranstaltungen Konzerttickets', 'Programmkino Theater'],
    it: ['radio online webradio', 'etichetta musicale podcast', 'eventi concerti biglietti', 'cinema teatro indipendente'],
    nl: ['online radiostation', 'muzieklabel podcast', 'evenementen concerten tickets', 'filmhuis theater'],
    ja: ['ネットラジオ 放送局', '音楽レーベル ポッドキャスト', 'ライブハウス イベント', 'ミニシアター 劇場'],
    zh: ['网络电台 播客', '独立音乐厂牌', '演出票务 活动', '独立影院 剧场'],
    ko: ['인터넷 라디오 방송', '인디 음악 레이블 팟캐스트', '공연 이벤트 예매', '독립영화관 소극장'],
    ar: ['راديو أونلاين إذاعة', 'بودكاست إنتاج موسيقي', 'تذاكر فعاليات وحفلات', 'مسرح وسينما'],
    hi: ['ऑनलाइन रेडियो स्टेशन', 'पॉडकास्ट म्यूजिक लेबल', 'लाइव इवेंट्स टिकट', 'थिएटर सिनेमा'],
  },
  'Medios, blogs y portales': {
    es: ['revista digital cultural', 'portal temático independiente', 'editorial libros librería', 'medio digital local'],
    en: ['digital magazine', 'independent publishing house', 'niche web portal', 'indie bookstore'],
    pt: ['revista digital cultural', 'editora independente livraria', 'portal temático', 'jornal digital regional'],
    fr: ['magazine numérique culturel', 'maison d’édition librairie', 'portail thématique', 'média indépendant'],
    de: ['Online Magazin Kultur', 'unabhängiger Verlag Buchhandlung', 'Themenportal', 'Lokalmedien'],
    it: ['rivista digitale culturale', 'casa editrice libreria', 'portale tematico', 'giornale online locale'],
    nl: ['digitaal tijdschrift', 'uitgeverij boekhandel', 'themaportaal', 'onafhankelijk medium'],
    ja: ['ウェブマガジン カルチャー', '出版社 書店', '専門ポータルサイト', '地域メディア'],
    zh: ['数字杂志 文化媒体', '独立书店 出版社', '垂直门户网站', '地方生活门户'],
    ko: ['웹진 디지털 매거진', '독립서점 출판사', '전문 포털 사이트', '지역 미디어'],
    ar: ['مجلة رقمية ثقافية', 'دار نشر ومكتبة', 'بوابة إلكترونية متخصصة', 'منصة محتوى عربي'],
    hi: ['डिजिटल पत्रिका', 'प्रकाशन और बुकस्टोर', 'वेब पोर्टल', 'स्थानीय डिजिटल मीडिया'],
  },
  'Arte, diseño y portafolios': {
    es: ['estudio diseño gráfico', 'fotografía profesional portafolio', 'productora audiovisual video', 'ilustración tatuajes estudio'],
    en: ['graphic design studio', 'photography portfolio', 'video production agency', 'illustration tattoo studio'],
    pt: ['estúdio design gráfico', 'fotografia profissional portfólio', 'produtora audiovisual', 'estúdio tatuagem ilustração'],
    fr: ['studio design graphique', 'photographe professionnel portfolio', 'production audiovisuelle', 'studio tatouage illustration'],
    de: ['Grafikdesign Studio', 'Fotograf Portfolio', 'Videoproduktion Agentur', 'Tattoo Illustrationsstudio'],
    it: ['studio grafico design', 'fotografo portfolio', 'produzione video audiovisiva', 'studio tatuaggi illustrazione'],
    nl: ['grafisch ontwerpbureau', 'fotograaf portfolio', 'videoproductie', 'tattooshop illustratie'],
    ja: ['デザイン事務所', 'フォトスタジオ 写真家', '映像制作会社', 'イラスト スタジオ'],
    zh: ['平面设计工作室', '摄影工作室 作品集', '影视制作公司', '插画纹身工作室'],
    ko: ['그래픽 디자인 스튜디오', '사진관 포토그래퍼', '영상 제작사', '일러스트 타투 스튜디오'],
    ar: ['استوديو تصميم جرافيك', 'مصور فوتوغرافي أعمال', 'شركة إنتاج مرئي', 'استوديو فنون ورسم'],
    hi: ['ग्राफिक डिजाइन स्टूडियो', 'फोटोग्राफी पोर्टफोलियो', 'वीडियो प्रोडक्शन', 'आर्ट एंड टैटू स्टूडियो'],
  },
  'Comercio y tiendas': {
    es: ['tiendas', 'mueblerías', 'ferreterías', 'tienda online catálogo', 'tienda de ropa calzado'],
    en: ['shop', 'furniture store', 'hardware store', 'online store catalog', 'clothing boutique'],
    pt: ['loja', 'loja de móveis', 'ferragens', 'loja virtual catálogo', 'loja de roupas'],
    fr: ['magasin', 'magasin de meubles', 'quincaillerie', 'boutique en ligne', 'magasin de vêtements'],
    de: ['Geschäft', 'Möbelhaus', 'Baumarkt', 'Onlineshop Katalog', 'Modegeschäft'],
    it: ['negozio', 'mobili', 'ferramenta', 'negozio online catalogo', 'abbigliamento'],
    nl: ['winkel', 'meubelzaak', 'bouwmarkt', 'webwinkel assortiment', 'kledingwinkel'],
    ja: ['店舗', '家具店', '金物店', 'オンラインショップ', 'アパレルショップ'],
    zh: ['商店', '家具店', '五金店', '网上商城', '服装店'],
    ko: ['상점', '가구점', '철물점', '온라인 쇼핑몰', '의류 매장'],
    ar: ['متجر', 'أثاث', 'أدوات منزلية', 'متجر إلكتروني', 'متجر ملابس'],
    hi: ['दुकान', 'फर्नीचर स्टोर', 'हार्डवेयर स्टोर', 'ऑनलाइन स्टोर', 'कपड़ों की दुकान'],
  },
  Tecnología: {
    es: ['servicio técnico computadoras', 'empresas de tecnología', 'desarrollo de software', 'ciberseguridad redes'],
    en: ['computer repair', 'IT services', 'software development company', 'cybersecurity network'],
    pt: ['assistência técnica informática', 'tecnologia', 'desenvolvimento de software', 'segurança da informação'],
    fr: ['réparation informatique', 'services informatiques', 'développement logiciel', 'cybersécurité réseaux'],
    de: ['Computerreparatur', 'IT Dienstleister', 'Softwareentwicklung', 'IT Sicherheit'],
    it: ['assistenza computer', 'servizi informatici', 'sviluppo software', 'sicurezza informatica'],
    nl: ['computer reparatie', 'IT diensten', 'softwareontwikkeling', 'cybersecurity'],
    ja: ['パソコン修理', 'ITサービス', 'システム開発会社', '情報セキュリティ'],
    zh: ['电脑维修', '信息技术服务', '软件开发公司', '网络安全服务'],
    ko: ['컴퓨터 수리', 'IT 서비스', '소프트웨어 개발사', '정보보안 네트워크'],
    ar: ['صيانة الكمبيوتر', 'خدمات تقنية', 'شركة برمجيات', 'أمن المعلومات والشبكات'],
    hi: ['कंप्यूटर रिपेयर', 'आईटी सेवाएं', 'सॉफ्टवेयर कंपनी', 'साइबर सुरक्षा'],
  },
  Educación: {
    es: ['academias', 'colegios', 'institutos', 'cursos online plataforma educativa'],
    en: ['school', 'academy', 'training institute', 'online courses elearning'],
    pt: ['escola', 'academia', 'instituto', 'cursos online plataforma educacional'],
    fr: ['école', 'centre de formation', 'institut', 'cours en ligne formation'],
    de: ['Schule', 'Akademie', 'Bildungsinstitut', 'Onlinekurse Weiterbildung'],
    it: ['scuola', 'accademia', 'istituto', 'corsi online formazione'],
    nl: ['school', 'opleidingscentrum', 'instituut', 'online cursussen opleiding'],
    ja: ['学校', '学習塾', '専門学校', 'オンラインスクール'],
    zh: ['学校', '培训学校', '学院', '在线课程 教育平台'],
    ko: ['학교', '학원', '교육원', '온라인 강의 교육'],
    ar: ['مدرسة', 'أكاديمية', 'معهد', 'دورات تدريبية أونلاين'],
    hi: ['स्कूल', 'अकादमी', 'संस्थान', 'ऑनलाइन कोर्स कोचिंग'],
  },
  Restaurantes: {
    es: ['restaurante', 'cafetería', 'pizzería', 'pastelería panadería'],
    en: ['restaurant', 'cafe', 'pizzeria', 'bakery'],
    pt: ['restaurante', 'cafeteria', 'pizzaria', 'padaria confeitaria'],
    fr: ['restaurant', 'café', 'pizzeria', 'boulangerie pâtisserie'],
    de: ['Restaurant', 'Café', 'Pizzeria', 'Bäckerei'],
    it: ['ristorante', 'caffetteria', 'pizzeria', 'pasticceria'],
    nl: ['restaurant', 'café', 'pizzeria', 'bakkerij'],
    ja: ['レストラン', '喫茶店', '食堂', 'ベーカリー'],
    zh: ['餐厅', '咖啡馆', '餐馆', '烘焙坊'],
    ko: ['식당', '카페', '레스토랑', '베이커리'],
    ar: ['مطعم', 'مقهى', 'بيتزا', 'مخبز وحلويات'],
    hi: ['रेस्टोरेंट', 'कैफे', 'भोजनालय', 'बेकरी'],
  },
  'Salud y bienestar': {
    es: ['clínica dental', 'consultorio médico', 'fisioterapia', 'psicología nutrición'],
    en: ['dental clinic', 'medical clinic', 'physiotherapy', 'psychology nutrition'],
    pt: ['clínica odontológica', 'consultório médico', 'fisioterapia', 'psicologia nutrição'],
    fr: ['cabinet dentaire', 'cabinet médical', 'kinésithérapie', 'psychologue nutrition'],
    de: ['Zahnarztpraxis', 'Arztpraxis', 'Physiotherapie', 'Psychologie Ernährung'],
    it: ['studio dentistico', 'studio medico', 'fisioterapia', 'psicologo nutrizionista'],
    nl: ['tandartspraktijk', 'huisartsenpraktijk', 'fysiotherapie', 'psycholoog voeding'],
    ja: ['歯科医院', 'クリニック', '整体院', 'カウンセリング'],
    zh: ['牙科诊所', '医疗诊所', '理疗', '心理咨询'],
    ko: ['치과', '의원', '물리치료', '심리상담 클리닉'],
    ar: ['عيادة أسنان', 'عيادة طبية', 'علاج طبيعي', 'تغذية وعلاج نفسي'],
    hi: ['दंत चिकित्सालय', 'क्लिनिक', 'फिजियोथेरेपी', 'डायग्नोस्टिक सेंटर'],
  },
  'Deportes y fitness': {
    es: ['gimnasio centro fitness', 'club deportivo crossfit', 'estudio yoga pilates', 'escuela artes marciales'],
    en: ['fitness gym', 'sports club crossfit', 'yoga pilates studio', 'martial arts academy'],
    pt: ['academia fitness', 'clube esportivo crossfit', 'estúdio yoga pilates', 'artes marciais'],
    fr: ['salle de sport fitness', 'club sportif crossfit', 'studio yoga pilates', 'arts martiaux'],
    de: ['Fitnessstudio', 'Sportverein Crossfit', 'Yoga Pilates Studio', 'Kampfsportschule'],
    it: ['palestra centro fitness', 'club sportivo crossfit', 'studio yoga pilates', 'arti marziali'],
    nl: ['sportschool fitness', 'sportclub crossfit', 'yoga pilates studio', 'vechtsportschool'],
    ja: ['フィットネスジム', 'スポーツクラブ', 'ヨガ ピラティス', '格闘技ジム'],
    zh: ['健身房 俱乐部', '体育馆 运动中心', '瑜伽普拉提馆', '武术馆'],
    ko: ['피트니스 헬스장', '스포츠 클럽 크로스핏', '요가 필라테스', '무도 체육관'],
    ar: ['نادي رياضي جيم', 'مركز لياقة بدنية', 'استوديو يوغا وبيلاتس', 'أكاديمية رياضية'],
    hi: ['जिम फिटनेस सेंटर', 'स्पोर्ट्स क्लब', 'योगा पिलाटेस स्टूडियो', 'मार्शल आर्ट्स अकादमी'],
  },
  'Turismo y hoteles': {
    es: ['hotel', 'hostal', 'agencia de viajes', 'cabañas ecoturismo'],
    en: ['hotel', 'guesthouse', 'travel agency', 'tour operator'],
    pt: ['hotel', 'pousada', 'agência de viagens', 'turismo passeios'],
    fr: ['hôtel', 'chambres d’hôtes', 'agence de voyages', 'gîte tourisme'],
    de: ['Hotel', 'Pension', 'Reisebüro', 'Ferienwohnung'],
    it: ['hotel', 'agriturismo', 'agenzia viaggi', 'bed and breakfast'],
    nl: ['hotel', 'pension', 'reisbureau', 'vakantiepark'],
    ja: ['ホテル', '旅館', '旅行会社', 'ゲストハウス'],
    zh: ['酒店', '民宿', '旅行社', '度假村'],
    ko: ['호텔', '펜션', '여행사', '게스트하우스'],
    ar: ['فندق', 'دار ضيافة', 'وكالة سفر', 'رحلات سياحية'],
    hi: ['होटल', 'गेस्ट हाउस', 'ट्रैवल एजेंसी', 'रिसॉर्ट टूर'],
  },
  Inmobiliarias: {
    es: ['inmobiliarias', 'corretaje propiedades', 'alquiler departamentos'],
    en: ['real estate agency', 'property agency', 'property management'],
    pt: ['imobiliária', 'imóveis', 'corretora de imóveis'],
    fr: ['agence immobilière', 'immobilier', 'gestion locative'],
    de: ['Immobilienmakler', 'Immobilien', 'Hausverwaltung'],
    it: ['agenzia immobiliare', 'immobili', 'affitti vendita case'],
    nl: ['makelaar', 'vastgoed', 'woningverhuur'],
    ja: ['不動産会社', '賃貸', '不動産管理'],
    zh: ['房地产公司', '房产中介', '房屋租赁'],
    ko: ['부동산', '공인중개사', '임대 관리'],
    ar: ['وكالة عقارية', 'عقارات', 'إدارة أملاك'],
    hi: ['रियल एस्टेट एजेंसी', 'प्रॉपर्टी', 'प्रॉपर्टी डीलर'],
  },
  Construcción: {
    es: ['constructoras', 'contratistas', 'remodelaciones estructuras'],
    en: ['construction company', 'building contractor', 'home renovation'],
    pt: ['construtora', 'empreiteira', 'reformas engenharia'],
    fr: ['entreprise de construction', 'artisan bâtiment', 'rénovation travaux'],
    de: ['Bauunternehmen', 'Handwerksbetrieb', 'Renovierung Sanierung'],
    it: ['impresa edile', 'costruzioni', 'ristrutturazioni'],
    nl: ['bouwbedrijf', 'aannemer', 'renovatie'],
    ja: ['建設会社', '工務店', 'リフォーム会社'],
    zh: ['建筑公司', '装修公司', '工程承包'],
    ko: ['건설회사', '인테리어', '시공 업체'],
    ar: ['شركة مقاولات', 'شركة بناء', 'تشطيبات وديكور'],
    hi: ['निर्माण कंपनी', 'ठेकेदार', 'इंटीरियर रेनोवेशन'],
  },
  Automotriz: {
    es: ['talleres mecánicos', 'repuestos automotrices', 'concesionario autolavado'],
    en: ['car repair', 'auto parts', 'auto detailing car wash'],
    pt: ['oficina mecânica', 'autopeças', 'estética automotiva'],
    fr: ['garage automobile', 'pièces automobiles', 'lavage auto carrosserie'],
    de: ['Autowerkstatt', 'Autoteile', 'Fahrzeugaufbereitung'],
    it: ['autofficina', 'ricambi auto', 'carrozzeria autolavaggio'],
    nl: ['autogarage', 'auto onderdelen', 'autoschade carwash'],
    ja: ['自動車整備', '自動車部品', '板金塗装 カーケア'],
    zh: ['汽车维修', '汽车配件', '汽车美容保养'],
    ko: ['자동차 정비', '자동차 부품', '세차 광택'],
    ar: ['ورشة سيارات', 'قطع غيار', 'عناية بالسيارات'],
    hi: ['कार सर्विस', 'ऑटो पार्ट्स', 'कार वॉश गैरेज'],
  },
  Belleza: {
    es: ['salones de belleza', 'peluquerías', 'barbería centro estético spa'],
    en: ['beauty salon', 'hair salon', 'barbershop spa'],
    pt: ['salão de beleza', 'cabeleireiro', 'barbearia estética spa'],
    fr: ['institut de beauté', 'salon de coiffure', 'barbier spa'],
    de: ['Kosmetikstudio', 'Friseursalon', 'Barbershop Spa'],
    it: ['centro estetico', 'parrucchiere', 'barbiere spa'],
    nl: ['schoonheidssalon', 'kapsalon', 'barbershop spa'],
    ja: ['美容室', 'エステサロン', '理容室 ネイルサロン'],
    zh: ['美容院', '美发店', '理发店 美甲SPA'],
    ko: ['미용실', '피부관리실', '바버샵 네일샵'],
    ar: ['صالون تجميل', 'صالون حلاقة', 'مركز عناية وسبا'],
    hi: ['ब्यूटी पार्लर', 'हेयर सैलून', 'स्पा और ग्रूमिंग'],
  },
  'ONGs y organizaciones': {
    es: ['fundación asociación sin fines de lucro', 'ONG voluntariado', 'club cultural comunidad'],
    en: ['nonprofit foundation', 'charity organization', 'cultural association'],
    pt: ['fundação associação sem fins lucrativos', 'ONG voluntariado', 'associação cultural'],
    fr: ['fondation association loi 1901', 'ONG solidarité', 'association culturelle'],
    de: ['Stiftung gemeinnütziger Verein', 'Hilfsorganisation', 'Kulturverein'],
    it: ['fondazione associazione culturale', 'organizzazione non profit', 'volontariato'],
    nl: ['stichting vereniging', 'goed doel organisatie', 'culturele vereniging'],
    ja: ['NPO法人 財団法人', 'ボランティア団体', '文化協会'],
    zh: ['公益基金会', '非营利组织 协会', '文化社团'],
    ko: ['비영리 재단 협회', '봉사단체 시민단체', '문화 협회'],
    ar: ['مؤسسة خيرية جمعية', 'منظمة غير ربحية', 'جمعية ثقافية'],
    hi: ['एनजीओ फाउंडेशन', 'चैरिटेबल ट्रस्ट', 'सामाजिक संस्था'],
  },
  Otros: {
    es: ['negocios locales', 'plataforma web independiente', 'servicios online', 'proyecto digital'],
    en: ['local business', 'independent web platform', 'online services', 'digital project'],
    pt: ['empresa local', 'plataforma web independente', 'serviços online', 'projeto digital'],
    fr: ['entreprise locale', 'plateforme web indépendante', 'services en ligne', 'projet numérique'],
    de: ['lokales Unternehmen', 'unabhängige Webplattform', 'Online Dienste', 'Digitalprojekt'],
    it: ['azienda locale', 'piattaforma web indipendente', 'servizi online', 'progetto digitale'],
    nl: ['lokaal bedrijf', 'onafhankelijk webplatform', 'online diensten', 'digitaal project'],
    ja: ['地元企業', '個人開発 サービス', 'オンラインサービス', 'Webプロジェクト'],
    zh: ['本地企业', '独立网站平台', '在线服务', '互联网项目'],
    ko: ['지역 업체', '독립 웹 플랫폼', '온라인 서비스', '웹 프로젝트'],
    ar: ['شركة محلية', 'منصة ويب مستقلة', 'خدمات إلكترونية', 'مشروع رقمي'],
    hi: ['स्थानीय व्यवसाय', 'स्वतंत्र वेब प्लेटफ़ॉर्म', 'ऑनलाइन सेवाएं', 'डिजिटल प्रोजेक्ट'],
  },
};

const digitalCategories = new Set<string>([
  'Servicios digitales y SaaS',
  'Manga, anime y cómics',
  'Lectura, libros y novelas',
  'Foros y comunidades',
  'Marketplaces y clasificados',
  'Empleo y talento',
  'Videojuegos y comunidades',
  'Entretenimiento y streaming',
  'Medios, blogs y portales',
]);

const defaultSectors = Array.from(new Set<SpecificCategory>([
  'Restaurantes', 'Salud y bienestar', 'Manga, anime y cómics',
  'Servicios digitales y SaaS', 'Lectura, libros y novelas', 'Foros y comunidades',
  ...specificCategories,
]));

const intents = ['contacto', 'sitio oficial', 'servicios', 'nosotros', 'reservas', 'contactar', 'empresa', 'atención', 'información', 'teléfono'];

const globalLanguages: SearchLanguage[] = ['es', 'en', 'pt', 'fr', 'de', 'ja', 'ar', 'it', 'zh', 'hi', 'nl', 'ko'];
// Explicit markets stop public providers from silently localizing all worldwide results to the server's IP.
const globalMarkets: Record<SearchLanguage, string[]> = {
  es: ['PE', 'MX', 'ES', 'AR', 'CO'], en: ['US', 'GB', 'AU', 'ZA', 'NG'], pt: ['BR', 'PT', 'AO', 'MZ', 'CV'],
  fr: ['FR', 'BE', 'CA', 'SN', 'CI'], de: ['DE', 'AT', 'CH', 'LI', 'LU'], ja: ['JP'], ar: ['EG', 'AE', 'MA', 'SA', 'JO'],
  it: ['IT', 'SM', 'CH', 'MT', 'VA'], zh: ['CN', 'TW', 'HK', 'SG', 'MY'], hi: ['IN'], nl: ['NL', 'BE', 'SR', 'AW', 'CW'], ko: ['KR'],
};
const languageCountries: Partial<Record<SearchLanguage, string>> = {
  es: 'AR BO CL CO CR CU DO EC ES GQ GT HN MX NI PA PE PR PY SV UY VE',
  pt: 'AO BR CV GW MZ PT ST TL', fr: 'BE BF BI BJ CD CF CG CI CM DJ FR GA GF GN GP HT KM LU MC MF MG ML MQ NC NE PF PM RE RW SC SN TD TF TG WF YT',
  de: 'AT CH DE LI', it: 'IT SM VA', nl: 'AW BQ CW NL SR SX', ja: 'JP', zh: 'CN HK MO TW', ko: 'KR KP',
  ar: 'AE BH DZ EG EH IQ JO KW LB LY MA MR OM PS QA SA SD SO SY TN YE', hi: 'IN',
};

const duckDuckGoRegions: Record<string, string> = {
  AR: 'ar-es', AU: 'au-en', AT: 'at-de', BE: 'be-fr', BR: 'br-pt', BG: 'bg-bg', CA: 'ca-en',
  CL: 'cl-es', CN: 'cn-zh', CO: 'co-es', HR: 'hr-hr', CZ: 'cz-cs', DK: 'dk-da', EE: 'ee-et',
  FI: 'fi-fi', FR: 'fr-fr', DE: 'de-de', GR: 'gr-el', HK: 'hk-tzh', HU: 'hu-hu', IN: 'in-en',
  ID: 'id-id', IE: 'ie-en', IL: 'il-he', IT: 'it-it', JP: 'jp-jp', KR: 'kr-kr', LV: 'lv-lv',
  LT: 'lt-lt', MY: 'my-ms', MX: 'mx-es', NL: 'nl-nl', NZ: 'nz-en', NO: 'no-no', PE: 'pe-es',
  PH: 'ph-en', PL: 'pl-pl', PT: 'pt-pt', RO: 'ro-ro', RU: 'ru-ru', SG: 'sg-en', SK: 'sk-sk',
  SI: 'sl-sl', ZA: 'za-en', ES: 'es-es', SE: 'se-sv', CH: 'ch-de', TW: 'tw-tzh', TH: 'th-th',
  TR: 'tr-tr', UA: 'ua-uk', GB: 'uk-en', US: 'us-en', VE: 've-es', VN: 'vn-vi',
};

function duckDuckGoRegion(market: string | undefined, language: SearchLanguage): string {
  if (!market) return 'wt-wt';
  if (market === 'BE' && language === 'nl') return 'be-nl';
  if (market === 'CA' && language === 'fr') return 'ca-fr';
  if (market === 'CH' && ['fr', 'it'].includes(language)) return `ch-${language}`;
  if (market === 'US' && language === 'es') return 'ue-es';
  return duckDuckGoRegions[market] ?? 'wt-wt';
}

const translatedIntents: Record<SearchLanguage, string[]> = {
  es: intents, en: ['contact', 'official website', 'services', 'about us', 'reservations', 'opening hours'],
  pt: ['contato', 'site oficial', 'serviços', 'sobre nós', 'reservas', 'horário'], fr: ['site officiel', 'contact', 'services', 'à propos', 'réservation', 'horaires'],
  de: ['Kontakt', 'offizielle Website', 'Leistungen', 'über uns', 'Reservierung', 'Öffnungszeiten'], it: ['contatti', 'sito ufficiale', 'servizi', 'chi siamo', 'prenotazioni', 'orari'],
  nl: ['officiële website', 'openingstijden', 'diensten', 'over ons', 'reserveren', 'contact'], ja: ['お問い合わせ', '公式サイト', 'サービス', '会社概要', '予約', '営業時間'],
  zh: ['联系我们', '官方网站', '服务', '关于我们', '预订', '营业时间'], ko: ['문의', '공식 사이트', '서비스', '소개', '예약', '영업시간'],
  ar: ['اتصل بنا', 'الموقع الرسمي', 'خدمات', 'من نحن', 'حجز', 'ساعات العمل'], hi: ['संपर्क', 'आधिकारिक वेबसाइट', 'सेवाएं', 'हमारे बारे में', 'बुकिंग', 'समय'],
};

const translatedDigitalIntents: Record<SearchLanguage, string[]> = {
  es: ['sitio oficial', 'online', 'plataforma', 'comunidad', 'catálogo', 'contacto'],
  en: ['official site', 'online', 'platform', 'community', 'catalog', 'contact'],
  pt: ['site oficial', 'online', 'plataforma', 'comunidade', 'catálogo', 'contato'],
  fr: ['site officiel', 'en ligne', 'plateforme', 'communauté', 'catalogue', 'contact'],
  de: ['offizielle Seite', 'online', 'Plattform', 'Community', 'Katalog', 'Kontakt'],
  it: ['sito ufficiale', 'online', 'piattaforma', 'community', 'catalogo', 'contatti'],
  nl: ['officiële site', 'online', 'platform', 'community', 'catalogus', 'contact'],
  ja: ['公式サイト', 'オンライン', 'プラットフォーム', 'コミュニティ', '一覧', 'お問い合わせ'],
  zh: ['官方网站', '在线', '平台', '社区', '目录', '联系我们'],
  ko: ['공식 사이트', '온라인', '플랫폼', '커뮤니티', '목록', '문의'],
  ar: ['الموقع الرسمي', 'أونلاين', 'منصة', 'مجتمع', 'دليل', 'اتصل بنا'],
  hi: ['आधिकारिक साइट', 'ऑनलाइन', 'प्लेटफ़ॉर्म', 'समुदाय', 'सूची', 'संपर्क'],
};

function searchLanguage(input: SearchInput): SearchLanguage {
  if (input.country === 'ALL') {
    const round = input.offset ?? 0;
    const cycle = input.category === categories[0] && !input.query.trim() ? Math.floor(round / defaultSectors.length) : 0;
    return globalLanguages[(round + cycle) % globalLanguages.length];
  }
  return (Object.entries(languageCountries).find(([, codes]) => codes?.split(' ').includes(input.country))?.[0] as SearchLanguage) ?? 'en';
}

function searchCategory(input: SearchInput): string {
  return input.category === categories[0] && !input.query.trim()
    ? defaultSectors[(input.offset ?? 0) % defaultSectors.length]
    : input.category;
}

function searchMarket(input: SearchInput): string | undefined {
  if (input.country !== 'ALL') return input.country;
  if (input.query.trim() || digitalCategories.has(searchCategory(input))) return undefined;
  const markets = globalMarkets[searchLanguage(input)];
  return markets[Math.floor((input.offset ?? 0) / globalLanguages.length) % markets.length];
}

// Offsets are discovery rounds with distinct queries: public search has no stable API pagination.
export function buildSearchQuery(input: SearchInput): string {
  const round = Math.max(0, Math.floor(input.offset ?? 0)); const query = input.query.trim(); const language = searchLanguage(input);
  const category = searchCategory(input);
  const isDigital = digitalCategories.has(category);
  const sectors = category !== categories[0] ? sectorTerms[category as SpecificCategory]?.[language] : undefined;
  // Across worldwide rounds, change language first, then the synonym and commercial intent.
  const variation = input.country === 'ALL' ? Math.floor(round / globalLanguages.length) : round;
  const sectorVariation = input.category === categories[0] && !query ? Math.floor(round / defaultSectors.length) : variation;
  const sector = sectors?.[sectorVariation % sectors.length] ?? '';
  const market = searchMarket(input);
  const geography = market ? new Intl.DisplayNames([language], { type: 'region' }).of(market) : '';
  const sameSector = sector && query.toLocaleLowerCase(language).includes(sector.toLocaleLowerCase(language));
  const localizedIntents = isDigital ? translatedDigitalIntents[language] : translatedIntents[language];
  return [query, sameSector ? '' : sector, geography, localizedIntents[variation % localizedIntents.length]].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const number = Number(value);
  return Number.isFinite(number) && value !== undefined ? Math.max(min, Math.min(max, Math.floor(number))) : fallback;
}
export function validateSearchInput(value: Record<string, unknown>): SearchInput {
  const query = typeof value.query === 'string' ? value.query.trim() : '';
  const country = typeof value.country === 'string' && value.country ? value.country.toUpperCase() : 'ALL';
  const category = typeof value.category === 'string' && value.category ? value.category : categories[0];
  if (query.length > 200) throw new SearchError('La búsqueda admite hasta 200 caracteres.', 'INVALID_INPUT', 400);
  if (!countries.some(c => c[0] === country) || !categories.includes(category)) throw new SearchError('Selecciona un país y un rubro válidos.', 'INVALID_INPUT', 400);
  return { query, country, category, limit: boundedInteger(value.limit, 8, 1, 12), offset: boundedInteger(value.offset, 0, 0, 59) };
}

const aggregator = /(?:^|\.)(facebook\.com|fb\.com|instagram\.com|linkedin\.com|youtube\.com|youtu\.be|tiktok\.com|x\.com|twitter\.com|wikipedia\.org|pinterest\.[a-z.]+|tripadvisor\.[a-z.]+|restaurantguru\.[a-z.]+|booking\.com|yelp\.[a-z.]+|opentable\.[a-z.]+|mercadolibre\.[a-z.]+|google\.[a-z.]+|bing\.com|duckduckgo\.com|paginasamarillas\.[a-z.]+|eldirectorio\.co|peru-directorio\.com|empresia\.pe|vonsel\.com|ctxplorer\.com|guiadentallima\.com|guiadelima\.pe|mrdentalcloud\.com|linktr\.ee|wa\.me|whatsapp\.com|nexdu\.com|mesa247\.pe|perutelefonos\.com|perupymes\.com|todosnegocios\.com|rentechdigital\.com|scribd\.com|yellowpages\.[a-z.]+|yell\.com|pagesjaunes\.fr|gelbeseiten\.de|paginegialle\.it|paginasamarelas\.com\.br|justdial\.com|sulekha\.com|indiamart\.com|foursquare\.com|trustpilot\.com|clutch\.co|chamberofcommerce\.com|hotfrog\.[a-z.]+|cylex\.[a-z.]+|kompass\.com|europages\.[a-z.]+|expedia\.[a-z.]+|agoda\.com|trivago\.[a-z.]+|hotels\.com|airbnb\.[a-z.]+|zomato\.com|doordash\.com|ubereats\.com|deliveroo\.[a-z.]+|thefork\.[a-z.]+|tabelog\.com|retty\.me|dianping\.com|meituan\.com|alibaba\.com|amazon\.[a-z.]+|ebay\.[a-z.]+|reddit\.com|github\.com|gitlab\.com|npmjs\.com|apple\.com|microsoft\.com|netflix\.com|spotify\.com|twitch\.tv|discord\.com|discord\.gg|crunchyroll\.com|myanimelist\.net|anilist\.co|fandom\.com|steampowered\.com|steamcommunity\.com|epicgames\.com|medium\.com|g2\.com|capterra\.[a-z.]+|softonic\.[a-z.]+|uptodown\.com)$/i;
type Candidate = { url: string; title: string; description: string };
const editorialGuide = /(?:^|\.)(guide\.michelin\.com|lefooding\.com|timeout\.[a-z.]+|lonelyplanet\.com|cntraveler\.com|travelandleisure\.com|theworlds50best\.com|eater\.com|fodor[s]?\.com|roughguides\.com)$/i;
const governmentDomain = /(?:^|\.)(?:gov(?:\.[a-z]{2})?|gob\.[a-z]{2}|gouv\.[a-z]{2})$/i;
const editorialCategories = new Set<string>(['Medios, blogs y portales', 'Lectura, libros y novelas', 'Manga, anime y cómics', 'Foros y comunidades', 'Videojuegos y comunidades']);
const mangaEvidence = /manga|manhwa|manhua|webtoon|webcomic|anime|c[oó]mic|fumett|bande dessin[eé]e|historiet|novelas? ligeras?|light novels?|漫画|漫畫|マンガ|まんが|アニメ|만화|웹툰|애니메이션|مانجا|مانغا|أنمي|मंगा|मांगा|कॉमिक/i;
export function filterCandidates(candidates: Candidate[], limit = 12, category = ''): Candidate[] {
  const allowEditorial = editorialCategories.has(category);
  const allowDirectories = category === 'Marketplaces y clasificados';
  const seen = new Set<string>(); const results: Candidate[] = [];
  for (const item of candidates) {
    try {
      const url = normalizeUrl(item.url); const host = url.hostname.replace(/^www\./, '');
      if (/(?:^|\.)wiktionary\.org$/i.test(host)) continue;
      // Public providers may interpret "leer" or "ler" as an unrelated acronym.
      if (category === 'Manga, anime y cómics' && !mangaEvidence.test(`${host} ${url.pathname} ${item.title} ${item.description}`)) continue;
      if (seen.has(host) || aggregator.test(host) || (!allowEditorial && editorialGuide.test(host)) || governmentDomain.test(host) || /\.(?:pdf|docx?|xlsx?|zip|jpg|png|webp|gif|svg|mp4)$/i.test(url.pathname)) continue;
      if (!allowEditorial && /\/(?:blog|news|noticias?|articles?|art[ií]culos?)(?:\/|-|$)/i.test(url.pathname)) continue;
      if (!allowDirectories && /\/(?:directorio|directory|annuaire)(?:\/|-|$)/i.test(url.pathname)) continue;
      if (!allowEditorial && !allowDirectories && /(?:^|\s)(?:los? \d+ mejores|top[ -]?\d+|\d+ best|best \d+|directorio de|directorio telef[oó]nico|listado con datos|p[aá]ginas amarillas|business directory|yellow pages|annuaire des|meilleurs restaurants|melhores restaurantes|beste restaurants)/i.test(item.title)) continue;
      if (!allowEditorial && !allowDirectories && /directorio (?:de|comercial|empresarial)|guía telef[oó]nica|encuentr[ae] los mejores (?:restaurantes|hoteles|negocios)|business directory|directory of (?:businesses|companies|restaurants)|list of (?:the best|top) (?:restaurants|hotels)|annuaire (?:professionnel|des entreprises)/i.test(item.description)) continue;
      seen.add(host);
      // Search often matches a contact subpage; the audit must inspect the homepage.
      results.push({ url: `${url.origin}/`, title: item.title.replace(/<[^>]+>/g, '').slice(0, 180), description: item.description.replace(/<[^>]+>/g, '').slice(0, 500) });
      if (results.length >= limit) break;
    } catch { /* Skip invalid or private destinations. */ }
  }
  return results;
}
function blockedPage(body: string): boolean {
  return /anomaly-modal|challenge-form|unusual traffic|verify (?:that )?you are (?:a )?human|<title>[^<]*(?:captcha|access denied|just a moment)/i.test(body);
}
export function parseDuckDuckGo(body: string): Candidate[] {
  if (blockedPage(body)) throw new SearchError('DuckDuckGo ha limitado la búsqueda automática temporalmente.', 'SEARCH_BLOCKED');
  const $ = load(body);
  if (!$('.result, .no-results, #links').length) throw new SearchError('El buscador devolvió una página sin resultados reconocibles.', 'SEARCH_RESPONSE');
  const result: Candidate[] = [];
  $('.result').each((_, element) => {
    const link = $(element).find('.result__a').first(); const href = link.attr('href');
    if (!href || $(element).hasClass('result--ad')) return;
    try {
      const target = new URL(href, 'https://duckduckgo.com');
      const url = target.hostname === 'duckduckgo.com' && target.pathname === '/l/' ? target.searchParams.get('uddg') : target.href;
      if (url) result.push({ url, title: link.text().trim(), description: $(element).find('.result__snippet').text().trim() });
    } catch { /* Skip malformed links. */ }
  });
  return result;
}
export function parseBingRss(body: string): Candidate[] {
  if (blockedPage(body) || !/<rss[\s>]/i.test(body) || !/<channel[\s>]/i.test(body)) throw new SearchError('Bing no devolvió un listado de búsqueda válido.', 'SEARCH_RESPONSE');
  const $ = load(body, { xmlMode: true });
  return $('item').map((_, element) => ({ url: $(element).find('link').text().trim(), title: $(element).find('title').text().trim(), description: $(element).find('description').text().trim() })).get();
}
async function readProvider(url: URL, fetcher: typeof fetch, accept: string, headers: Record<string, string> = {}): Promise<string> {
  let response: Response;
  try { response = await fetcher(url, { headers: { Accept: accept, 'User-Agent': 'StackRadar/1.0 (+public-business-website-review)', ...headers }, signal: AbortSignal.timeout(9000), cache: 'no-store' }); }
  catch { throw new SearchError('El buscador no respondió. Comprueba tu conexión e inténtalo de nuevo.', 'SEARCH_UNAVAILABLE'); }
  if (!response.ok) {
    if ([401, 403].includes(response.status)) throw new SearchError('El proveedor no permite esta consulta.', 'SEARCH_BLOCKED');
    if (response.status === 429) throw new SearchError('El buscador ha limitado las consultas. Espera un minuto antes de continuar.', 'SEARCH_RATE_LIMIT', 429);
    throw new SearchError('El buscador no está disponible temporalmente.', 'SEARCH_UNAVAILABLE');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new SearchError('El buscador devolvió una respuesta vacía.', 'SEARCH_RESPONSE');
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.length;
      if (bytes > 1_000_000) { await reader.cancel(); throw new SearchError('La respuesta del buscador supera el tamaño permitido.', 'SEARCH_RESPONSE'); }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof SearchError) throw error;
    throw new SearchError('Se interrumpió la respuesta del buscador.', 'SEARCH_UNAVAILABLE');
  }
  return Buffer.concat(chunks).toString('utf8');
}
export async function searchWeb(input: SearchInput, fetcher: typeof fetch = fetch): Promise<SearchResult> {
  input = validateSearchInput(input);
  const query = buildSearchQuery(input); const key = process.env.BRAVE_SEARCH_API_KEY?.trim(); const language = searchLanguage(input);
  const category = searchCategory(input);
  const market = searchMarket(input);
  const localeHeaders = { 'Accept-Language': market ? `${language}-${market},${language};q=0.9` : language };
  const providers: { name: string; run: () => Promise<Candidate[]> }[] = [];
  if (key) providers.push({ name: 'Brave Search', run: async () => {
    const endpoint = new URL('https://api.search.brave.com/res/v1/web/search');
    endpoint.searchParams.set('q', query); endpoint.searchParams.set('count', '20'); endpoint.searchParams.set('search_lang', language === 'ja' ? 'jp' : language === 'zh' ? 'zh-hans' : language);
    // Brave only supports a subset of ISO countries. The query carries geography for every region.
    const braveCountries = 'AR AU AT BE BR CA CL DK FI FR DE HK IN ID IT JP KR MY MX NL NZ NO CN PL PT PH RU SA ZA ES SE CH TW TR GB US'.split(' ');
    endpoint.searchParams.set('country', market && braveCountries.includes(market) ? market : 'ALL'); endpoint.searchParams.set('safesearch', 'moderate'); endpoint.searchParams.set('text_decorations', 'false');
    endpoint.searchParams.set('offset', String(Math.min(9, Math.floor((input.offset ?? 0) / globalLanguages.length))));
    const body = await readProvider(endpoint, fetcher, 'application/json', { 'X-Subscription-Token': key });
    let data; try { data = JSON.parse(body); } catch { throw new SearchError('Brave devolvió una respuesta inválida.', 'SEARCH_RESPONSE'); }
    if (!Array.isArray(data?.web?.results)) {
      if (data?.type === 'search' && !data.web) return [];
      throw new SearchError('Brave devolvió una respuesta inválida.', 'SEARCH_RESPONSE');
    }
    return data.web.results.filter((item: Record<string, unknown>) => typeof item?.url === 'string').map((item: Record<string, unknown>) => ({ url: item.url as string, title: String(item.title ?? ''), description: String(item.description ?? '') }));
  } });
  providers.push({ name: 'DuckDuckGo', run: async () => {
    const endpoint = new URL('https://html.duckduckgo.com/html/'); endpoint.searchParams.set('q', query);
    endpoint.searchParams.set('kl', duckDuckGoRegion(market, language));
    return parseDuckDuckGo(await readProvider(endpoint, fetcher, 'text/html', localeHeaders));
  } });
  providers.push({ name: 'Bing RSS', run: async () => {
    const endpoint = new URL('https://www.bing.com/search'); endpoint.searchParams.set('q', query);
    endpoint.searchParams.set('format', 'rss'); endpoint.searchParams.set('count', '20');
    endpoint.searchParams.set('setlang', language);
    if (market) endpoint.searchParams.set('cc', market.toLowerCase());
    return parseBingRss(await readProvider(endpoint, fetcher, 'application/rss+xml,application/xml,text/xml', localeHeaders));
  } });
  const failures: SearchError[] = []; let emptyProvider = ''; let results: Candidate[] = []; const contributingProviders: string[] = [];
  for (const provider of providers) {
    try {
      const before = results.length;
      results = filterCandidates([...results, ...await provider.run()], input.limit ?? 8, category);
      if (results.length > before) contributingProviders.push(provider.name);
      if (results.length >= (input.limit ?? 8)) break;
      emptyProvider = provider.name;
    } catch (error) { failures.push(error instanceof SearchError ? error : new SearchError('No se pudo leer la respuesta del buscador.', 'SEARCH_RESPONSE')); }
  }
  if (results.length) {
    const provider = contributingProviders.join(' + ');
    return { results, provider, query, category, ...(failures.length ? { warning: `Resultados conservados de ${provider}; otro proveedor no estuvo disponible.` } : {}) };
  }
  if (emptyProvider) return { results: [], provider: emptyProvider, query, category, warning: 'No se encontraron sitios web para esta consulta. Prueba otro rubro o ubicación.' };
  const rateLimited = failures.some(error => error.status === 429 || error.code === 'SEARCH_BLOCKED');
  throw new SearchError(rateLimited ? 'Los buscadores públicos han limitado las consultas. Espera un minuto y vuelve a buscar; tus resultados anteriores se conservan.' : 'No se pudo consultar ningún buscador. Comprueba tu conexión y vuelve a intentarlo.', rateLimited ? 'SEARCH_RATE_LIMIT' : 'SEARCH_UNAVAILABLE', rateLimited ? 429 : 503);
}
