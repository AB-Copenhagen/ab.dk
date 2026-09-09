#!/usr/bin/env node
// One-off migration: pushes the player bio/quote/nickname/formerClubs data and
// name/number/position overrides currently hardcoded in
// src/data/player-cms-data.ts (captured below, since that file is being
// trimmed to just the resolve*() fallback helpers once the CMS is the source
// of truth), plus the hide-from-squad/hide-photo flags currently hardcoded in
// src/lib/si/player-photos.ts, into Strapi's `player` content type.
//
// Idempotent: upserts by `siPlayerId`, so it's safe to re-run.
// Leaves `photo` unset — nothing correct exists to upload yet (that's the
// entire premise of this feature); editors upload a current photo directly in
// Strapi admin once one exists.
//
// Usage: node --env-file=.env.local scripts/seed-player-overrides.mjs
//   (requires STRAPI_URL and a write-scoped STRAPI_API_TOKEN in .env.local)
const STRAPI_URL = (process.env.STRAPI_URL ?? 'http://localhost:1337').replace(
  /\/$/,
  ''
);
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!STRAPI_API_TOKEN) {
  console.error(
    'Missing STRAPI_API_TOKEN. Run with: node --env-file=.env.local scripts/seed-player-overrides.mjs'
  );
  process.exit(1);
}

// Captured from src/data/player-cms-data.ts's PLAYER_CMS_DATA before it's
// trimmed down. Each entry's SI player ID is the object key there.
const PLAYERS = [
  {
    siPlayerId: 658977,
    nickname: 'Bobby',
    formerClubs: 'AC Horsens, Skive IK',
    bio: {
      en: 'Marcus Bobjerg is a key part of our strong goalkeeper trio. With matches at Superliga level on his resume, Bobjerg brings experience and strong leadership qualities to the team. He has early on established himself as a talented last line of defense with strong reflexes and good game understanding. At AB, he contributes with both composure and quality between the posts, while continuing to develop his game.',
      da: "Marcus Bobjerg er en central del af vores stærke målmandstrio. Med kampe på Superliga-niveau på cv'et bringer Bobjerg erfaring og stærke lederegenskaber til holdet. Han har tidligt etableret sig som et talentfuldt sidste forsvarslinie med stærke reflekser og god spilforståelse. Hos AB bidrager han med både ro og kvalitet mellem stengene, mens han fortsætter med at udvikle sit spil.",
    },
    quote: {
      en: "I'm proud to be part of an exciting project at AB",
      da: 'Jeg er stolt af at være en del af et spændende projekt hos AB',
    },
  },
  {
    siPlayerId: 1901268,
    nickname: 'Stoney',
    formerClubs:
      'Boston University, UConn, Concafa SC, Fort Lauderdale United FC',
    bio: {
      en: 'Hard-working, strong leader, proactive and strong in aerial duels. His biggest role model is his dad — the reason he started playing football. In his spare time, Stone enjoys reading, going to the beach and spending time with his family.',
      da: 'Hård arbejder, stærk leder, proaktiv og stærk i luftdueller. Hans største forbillede er hans far — grunden til, at han begyndte at spille fodbold. I fritiden nyder Stone at læse, gå til stranden og tilbringe tid med sin familie.',
    },
    quote: {
      en: 'Everything that manifests in the physical world begins as a thought.',
      da: 'Alt, der manifesterer sig i den fysiske verden, begynder som en tanke.',
    },
  },
  {
    siPlayerId: 1044459,
    nickname: 'Benny D',
    formerClubs: 'HK Kópavogs, IFK Göteborg, Trollhättan, Östersund FK',
    bio: {
      en: "Our Icelandic goalkeeper joined the club in the summer of 2025, and has proven to be an important player in the goalkeeper trio. Adam is a very athletic and brave goalkeeper with good reflexes, which gives him an advantage in the air, while also being quick on the line. Outside the lines, Adam has a great interest in a wide range of sports besides football — from basketball to Formula 1 and even darts. When he's not following sport, Adam might also go hunting or on a fishing trip. His biggest role model is his father, who has always been there for him and his family.",
      da: 'Vores islandske målmand tiltrådte klubben i sommeren 2025 og har vist sig at være en vigtig spiller i målmandstrien. Adam er en meget atletisk og modig målmand med gode reflekser, hvilket giver ham en fordel i luften, mens han også er hurtig på stregen. Uden for banen har Adam stor interesse for en bred vifte af sportsgrene ud over fodbold — fra basketball til Formel 1 og endda dart. Når han ikke følger sport, kan Adam finde på at gå på jagt eller på fisketur. Hans største forbillede er hans far, som altid har været der for ham og hans familie.',
    },
    quote: {
      en: 'I want to never lose again',
      da: 'Jeg vil aldrig tabe igen',
    },
  },
  {
    siPlayerId: 803645,
    nickname: 'G',
    formerClubs: 'Silkeborg IF, FC Fredericia, Vestri, Næstved BK',
    bio: {
      en: "Jeppe is one of the more experienced players in the squad. He joined the club in the summer of 2025 and has previously played in the top division, bringing enormous experience to the team. His dueling ability and skill at reading the game, along with his calm play on the pitch, make him a solid defender in our backline. His biggest role model is his brother, who he can always count on to be by his side. When Jeppe isn't playing football, he enjoys golf.",
      da: 'Jeppe er en af de mere erfarne spillere i truppen. Han tiltrådte klubben i sommeren 2025 og har tidligere spillet i den bedste division, hvilket bringer enorm erfaring med til holdet. Hans dueleringsevne og sans for at læse spillet, kombineret med sin rolige spilstil på banen, gør ham til en solid forsvarsspiller i vores defensiv. Hans største forbillede er hans bror, som han altid kan regne med. Når Jeppe ikke spiller fodbold, nyder han at spille golf.',
    },
    quote: {
      en: 'What if I fall? Oh but my darling, what if you fly?',
      da: 'Hvad nu hvis jeg falder? Men kære, hvad nu hvis du flyver?',
    },
    // Present in EXCLUDED_PLAYER_SLUGS (src/lib/si/player-photos.ts) as of this
    // migration — carried over as-is; a known pre-existing quirk (#2 has a bio
    // yet is also excluded from the squad display), not something this script
    // resolves.
    hideFromSquad: true,
  },
  {
    siPlayerId: 1146398,
    nickname: 'Adri',
    formerClubs: 'FC Augsburg II, SGV Freiberg',
    bio: {
      en: "Koudelka is our strong central defender from Germany. He is a player who, with his playing skills and strong mentality, contributes both stability on the field and good leadership abilities. He has represented both Germany and the Czech Republic at youth level, as well as played in the Bundesliga for youth players. He is a player who always leads from the front, and you can always expect 100% effort from him — whether it's a match or training.",
      da: 'Koudelka er vores stærke centrale forsvarer fra Tyskland. Han er en spiller, som med sine spillemæssige færdigheder og stærke mentalitet bidrager med både stabilitet på banen og gode lederegenskaber. Han har repræsenteret både Tyskland og Tjekkiet på ungdomsniveau og har desuden spillet i Bundesligaen for ungdomsspillere. Han er en spiller, der altid går forrest, og du kan altid forvente 100% indsats fra ham — uanset om det er kamp eller træning.',
    },
    quote: {
      en: "The team's success is above everything for me",
      da: 'Holdets succes er vigtigere end alt andet for mig',
    },
    // Present in PENDING_PHOTO_SHIRT_NUMBERS (#4) — real SI photo exists but is
    // from an old kit/season.
    hidePhoto: true,
  },
  {
    siPlayerId: 169891,
    formerClubs: 'SønderjyskE, FC Midtjylland, FC Vestsjælland, Viborg',
    bio: {
      en: 'Marc Dal Hende is the club captain and one of the most experienced players in the squad. With over 200 matches in the Danish Superliga, two Danish championships, and a cup title on his resume, he brings tremendous experience to AB. He has also played in Champions League matches, which underlines his high-level expertise. As captain, he is a key player both on and off the field, where his leadership, work ethic, and professionalism set the standard for the rest of the team.',
      da: "Marc Dal Hende er klubkaptajn og en af de mest erfarne spillere i truppen. Med over 200 kampe i den danske Superliga, to danske mesterskaber og en pokaltitel på cv'et bringer han enorm erfaring med til AB. Han har desuden spillet i Champions League-kampe, hvilket understreger hans ekspertise på øverste niveau. Som kaptajn er han en nøglespiller både på og uden for banen, hvor hans lederskab, arbejdsetik og professionalisme sætter standarden for resten af holdet.",
    },
  },
  {
    siPlayerId: 1140925,
    nickname: 'Tra',
    shirtNumberOverride: 3, // changed from #21; SI API still reports 21
    formerClubs:
      'MLS Seattle Sounders, FC Tulsa, Tacoma Defiance, Hamburger SV II',
    bio: {
      en: 'Middle child of 4 siblings (all girls). A fun fact about Tra: he has a black belt in Brazilian Jiu Jitsu. His biggest inspiration is Denzel Washington because of his versatility, integrity, and hard work. In his spare time, he enjoys school, boxing, and reading books.',
      da: 'Midterste barn af 4 søskende (alle piger). En sjov kendsgerning om Tra: han har et sort bælte i brasiliansk jiu-jitsu. Hans største inspiration er Denzel Washington på grund af hans alsidighed, integritet og hårde arbejde. I fritiden nyder han skole, boksning og at læse bøger.',
    },
    quote: {
      en: 'Dreams without goals are just dreams',
      da: 'Drømme uden mål er bare drømme',
    },
    // Present in PENDING_PHOTO_SHIRT_NUMBERS (#3).
    hidePhoto: true,
  },
  {
    siPlayerId: 1097007,
    nickname: 'Dam',
    formerClubs: 'Holstebro BK, FC Midtjylland U19',
    bio: {
      en: "Tobias Damtoft received his football education from FC Midtjylland's youth academy and plays as a right-back. He is an attacking full-back with pace and courage, constantly looking for opportunities to push forward and create imbalances. With his drive and work ethic, he adds an extra dimension to the team on the right side. Tobias has also played for Holstebro in the 3rd division and is known for his willingness to work hard at both ends of the pitch.",
      da: 'Tobias Damtoft fik sin fodboldopdragelse i FC Midtjyllands ungdomsakademi og spiller som højreback. Han er en angribende back med fart og mod, der konstant søger muligheder for at drive frem og skabe ubalance. Med sit drive og sin arbejdsetik tilføjer han holdet en ekstra dimension på højresiden. Tobias har desuden spillet for Holstebro i 3. division og er kendt for sin vilje til at arbejde hårdt i begge ender af banen.',
    },
    quote: {
      en: "When AB came calling, I didn't think twice about it",
      da: 'Da AB ringede, tøvede jeg ikke et sekund',
    },
  },
  {
    siPlayerId: 1664860,
    nickname: 'Ibber',
    formerClubs: 'AB U19',
    bio: {
      en: "Few teams can boast having a defender who's 201 cm tall, but we can at AB. Ibsen is a product of our own academy, and in summer 2024 made the jump from the U19 team up to the senior squad. When he's not heading balls out of the box or into the net, Ibsen plays padel, cycles and is reportedly quite a skilled rapper too.",
      da: 'Få hold kan prale af at have en forsvarsspiller, der er 201 cm høj, men det kan vi hos AB. Ibsen er et produkt af vores eget akademi og sprang i sommeren 2024 fra U19-holdet op til seniorholdet. Når han ikke header bolde ud af feltet eller i nettet, spiller Ibsen padel, cykler og er angiveligt også en ret dygtig rapper.',
    },
    quote: {
      en: 'Look inward before you point fingers',
      da: 'Kig indad, inden du peger fingre ad andre',
    },
  },
  {
    siPlayerId: 1785818,
    nickname: 'Warrer',
    formerClubs: 'Kolding IF U19, Randers FC Youth',
    bio: {
      en: "When I'm not on the pitch, I enjoy golf and cycling. I'm passionate about optimizing my body and constantly chasing those small percentage gains that can make a big difference.",
      da: 'Når jeg ikke er på banen går jeg meget op i golf og cykling og er stor fan af at optimere min krop så meget som muligt og jagte de små procenter.',
    },
    quote: {
      en: 'Hard work and obsession always wins',
      da: 'Hårdt arbejde og besættelse vinder altid',
    },
  },
  {
    siPlayerId: 1079276,
    displayNameOverride: 'Søren Ilsøe',
    nickname: 'FireLake',
    formerClubs: 'Esbjerg, Odense, NE Huskies, UConn Huskies',
    bio: {
      en: "Søren Ilsøe is part of AB's captain group and is known as a true fighter in midfield. He received his football education from Esbjerg fB's youth academy and has since played university football in the USA for both NE Huskies and UConn Huskies. On the field, Ilsøe is a strong duelist with a great winning mentality, who dominates in aerial play and often leads the way in close combat. With his jersey firmly tucked into his shorts, he represents the old-school playing style — uncompromising, hardworking, and with a big heart for the team.",
      da: 'Søren Ilsøe er en del af ABS kaptajnsgruppe og er kendt som en sand kæmper på midtbanen. Han fik sin fodboldopdragelse i Esbjerg fBs ungdomsakademi og har siden spillet universitetsfodbold i USA for både NE Huskies og UConn Huskies. På banen er Ilsøe en stærk duellant med en fremragende vindermentalitet, der dominerer i luftdueller og ofte går forrest i nærkamp. Med trøjen fast stukket i shortsene repræsenterer han den gammeldags spillestil — kompromisløs, hårdt arbejdende og med et stort hjerte for holdet.',
    },
    quote: {
      en: 'AB is a club with a proud tradition and a big past, but the story needs to be retold, and I want to be part of it',
      da: 'AB er en klub med en stolt tradition og en stor fortid, men historien skal fortælles igen, og jeg vil gerne være en del af det',
    },
  },
  {
    siPlayerId: 1666064,
    nickname: 'Clemme',
    formerClubs: 'VSK Aarhus, Odder IGF',
    bio: {
      da: 'Jeg kan godt lide at spille golf og følger med i sporten. Ud over det så bruger jeg meget tid med familie og venner.',
      en: 'I enjoy playing golf and keeping up with the sport. Outside of that, I spend most of my free time with family and friends.',
    },
    quote: {
      da: 'Aldrig mist troen',
      en: 'Never lose faith',
    },
  },
  {
    siPlayerId: 1614170,
    formerClubs: 'Skive IK, Virginia Tech, Elon Phoenix, Randers FC U19',
    bio: {
      en: 'Marco Vesterholm is a hardworking midfielder who excels at controlling the pace of the game. He is strong in duels and shows good aggression in his play. Vesterholm comes from Skive IF, where he served as captain, and also has experience from the USA where he played at Elon University and Virginia Tech University. He received his youth training at the Randers FC youth academy. Since childhood, his idols have been Manchester United legends Wayne Rooney and Paul Scholes. In his free time, Marco enjoys following American football, and he also enjoys a sauna session from time to time.',
      da: 'Marco Vesterholm er en hårdt arbejdende midtbanespiller, der er fremragende til at kontrollere spillets tempo. Han er stærk i dueller og viser god aggressivitet i sit spil. Vesterholm kommer fra Skive IF, hvor han var kaptajn, og har desuden erfaring fra USA, hvor han spillede for Elon University og Virginia Tech University. Han fik sin ungdomsopdragelse i Randers FCs ungdomsakademi. Siden barndommen har hans idoler været Manchester United-legenderne Wayne Rooney og Paul Scholes. I fritiden følger Marco gerne amerikansk fodbold og nyder også en saunaomgang fra tid til anden.',
    },
  },
  {
    siPlayerId: 1576737,
    formerClubs: 'Vejle Boldklub, Danish U19',
  },
  {
    siPlayerId: 1816931,
    nickname: 'Alfi',
    formerClubs: 'AB U19',
    bio: {
      en: 'Alfred was promoted from the academy to the senior squad in the summer of 2025. He is a player who has both the technique and the physicality to be a dominant player in midfield. When Alfred has time for it, he loves to travel and experience the world. His big role model is the football player Eze, because like Alfred, he never gives up!',
      da: 'Alfred rykkede op fra akademiet til seniorholdet i sommeren 2025. Han er en spiller, der har både teknikken og det fysiske til at være en dominerende spiller på midtbanen. Når Alfred har tid til det, elsker han at rejse og opleve verden. Hans store forbillede er fodbolspilleren Eze, fordi han ligesom Alfred aldrig giver op!',
    },
    quote: {
      en: 'Do what you love',
      da: 'Gør det du elsker',
    },
  },
  {
    siPlayerId: 1166286,
    positionOverride: 'defender', // SI API has him as midfielder
    nickname: 'Brund',
    formerClubs: 'Hobro',
    bio: {
      en: 'Brund joined the club at the start of 2024, and has since become an important piece in midfield, where his leadership qualities and great overview benefit everyone around him. He also specializes in long throw-ins, which contribute to even more offensive weapons for AB. A fun fact about Brund is that he is a former gymnast, and besides football, he is also interested in cars and wine.',
      da: 'Brund tiltrådte klubben i starten af 2024 og er siden blevet et vigtigt element på midtbanen, hvor hans lederegenskaber og gode overblik gavner alle omkring ham. Han er desuden specialist i lange indkast, hvilket bidrager med endnu flere offensive våben til AB. En sjov kendsgerning om Brund er, at han er en tidligere gymnast, og ud over fodbold er han også interesseret i biler og vin.',
    },
    quote: {
      en: 'Prioritize the work, before the dream',
      da: 'Prioriter arbejdet, inden drømmen',
    },
  },
  {
    siPlayerId: 1782785,
    nickname: 'Maale',
    formerClubs: 'AB U19',
    bio: {
      en: "Maale has played at AB's academy since U13, and was promoted to the senior squad in summer 2024 due to his clear talent. He is a player with great running capacity, good vision for the game and is very confident on the ball. Outside football, Maale enjoys playing padel, and when he really wants to treat himself, he goes for a good burger. His biggest inspiration is his father, whom he looks up to because of his mindset and the things he has achieved in life.",
      da: 'Maale har spillet i ABs akademi siden U13 og rykkede op til seniorholdet i sommeren 2024 på grund af sit klare talent. Han er en spiller med stor løbekapacitet, godt blik for spillet og er meget sikker på bolden. Uden for fodboldens verden nyder Maale at spille padel, og når han virkelig vil forkæle sig selv, går han efter en god burger. Hans største inspiration er hans far, som han ser op til på grund af hans mindset og de ting, han har opnået i livet.',
    },
    quote: {
      en: "Hard work beats talent, when talent doesn't work hard",
      da: 'Hårdt arbejde slår talent, når talent ikke arbejder hårdt',
    },
    // Present in EXCLUDED_PLAYER_SLUGS — same pre-existing quirk as #2 above.
    hideFromSquad: true,
  },
  {
    siPlayerId: 1531777,
    formerClubs: 'FC Kitzbühel, QPR U21',
    bio: {
      en: "Steven Bala is an English/Albanian offensive player who received his football education in England, where he played U18 at Barnet FC and later both U18 and U21 at QPR. He is a technically skilled player who can cover multiple positions on the front line and contributes with creativity and ball control in offensive play. Bala also brings international experience from Albania's U21 national team. He is known as a highly dedicated player who is often the first to arrive in the morning and isn't afraid to put in extra training - even on his days off.",
      da: 'Steven Bala er en engelsk/albansk offensiv spiller, der fik sin fodboldopdragelse i England, hvor han spillede U18 for Barnet FC og senere både U18 og U21 for QPR. Han er en teknisk dygtig spiller, der kan dække flere positioner på kæden, og bidrager med kreativitet og boldkontrol i det offensive spil. Bala har desuden international erfaring fra Albaniens U21-landshold. Han er kendt som en meget dedikeret spiller, der ofte er den første på træningsbanen om morgenen og ikke er bange for at lægge ekstra træning oveni - selv på sine fridage.',
    },
    quote: {
      da: 'AB er det perfekte sted for mig at gå hen',
      en: 'AB is the perfect place for me to go',
    },
    // Present in PENDING_PHOTO_SHIRT_NUMBERS (#17).
    hidePhoto: true,
  },
  {
    siPlayerId: 1676711,
    nickname: 'Saliou',
    formerClubs: 'Stade Brestois, Brest B',
    bio: {
      da: 'Saliou er en stærk, teknisk spiller og en kynisk afslutter.',
      en: 'Saliou is a powerful, technical player and a clinical finisher.',
    },
    quote: {
      da: 'Ingen smerte, ingen vinding',
      en: 'No pain, no gain',
    },
  },
  {
    siPlayerId: 1614159,
    displayNameOverride: 'Noah Engell',
    positionOverride: 'forward',
    nickname: 'Engell',
    formerClubs: 'AB, OB U19, HIK',
    bio: {
      en: "Noah Engell played for a number of years at AB's academy before he moved to Svendborg fBY in 2018. He subsequently played for OB's U19 team, then Frederikssund IK and HIK, where he impressed greatly. In the autumn season of 2024 he was the club's top scorer with 8 goals and 3 assists in 16 games in the 2nd division. In total, he is credited with 10 goals and 7 assists in the Hellerup club before joining AB.",
      da: 'Noah Engell spillede i en årrække i ABs akademi, inden han i 2018 skiftede til Svendborg fBY. Han har efterfølgende spillet for OBs U19-hold, derefter Frederikssund IK og HIK, hvor han imponerede stort. I efterårssæsonen 2024 var han klubbens topscorer med 8 mål og 3 assists i 16 kampe i 2. division. I alt er han noteret for 10 mål og 7 assists i Hellerup-klubben inden skiftet til AB.',
    },
  },
  {
    siPlayerId: 1075424,
    displayNameOverride: 'Emil Mygind Jensen',
    nickname: 'Myg',
    formerClubs: 'Herlev IF',
    bio: {
      en: "'Myg' is a physically strong and versatile player who can cover all forward positions on the team. He truly had his breakthrough in the fall of 2022, scoring 6 goals. He started at his childhood club FC Jonstrup, played his youth years at AB from 2012, took a short detour to neighbouring Herlev IF, then returned to the green jersey in the fall of 2021. In addition to his physical strength and goal-scoring ability, he has a great work ethic and discipline that helps set a sky-high standard in training culture. In his free time, he enjoys watching films, playing the piano, spending time with family and friends, and baking buns.",
      da: "'Myg' er en fysisk stærk og alsidig spiller, der kan dække alle angrebspositioner på holdet. Han fik sit gennembrud i efteråret 2022 med 6 mål. Han startede i barndomsklubben FC Jonstrup, spillede ungdomsår i AB fra 2012, tog en kort omvej til naboklubben Herlev IF og vendte derefter tilbage til den grønne trøje i efteråret 2021. Ud over sin fysiske styrke og målscorerevne har han en fremragende arbejdsetik og disciplin, der er med til at sætte en ekstremt høj standard i trænkulturen. I fritiden nyder han at se film, spille klaver, tilbringe tid med familie og venner og bage boller.",
    },
    quote: {
      en: "You miss 100% of the shots you don't take",
      da: 'Du misser 100% af de skud du ikke tager',
    },
  },
  {
    siPlayerId: 754317,
    nickname: 'Ramme',
    formerClubs: 'AaB, Hvidovre, QPR U21',
    bio: {
      en: "Marco Ramkilde is a technically skilled striker who combines ball control with aggression in his play. He has Superliga experience, having represented both AaB and Hvidovre, and has also played in England for QPR's U21 team. Ramkilde is a valuable player who contributes both quality and experience to the attack.",
      da: 'Marco Ramkilde er en teknisk dygtig angriber, der kombinerer boldsikkerhed med aggressivitet i sit spil. Han har Superliga-erfaring, idet han har repræsenteret både AaB og Hvidovre, og har desuden spillet i England for QPRs U21-hold. Ramkilde er en værdifuld spiller, der bidrager med både kvalitet og erfaring i angrebet.',
    },
    // Present in PENDING_PHOTO_SHIRT_NUMBERS (#10).
    hidePhoto: true,
  },
  {
    siPlayerId: 1073406,
    nickname: 'Gren',
    formerClubs: 'FC Roskilde, Kentucky Wildcats, Pittsburgh Panthers',
    bio: {
      en: "Casper Grening comes from FC Roskilde's youth academy and has since played college soccer in the USA for both the University of Kentucky and the University of Pittsburgh. With the Pittsburgh Panthers, he helped lead the team to the prestigious 'Elite Eight' in the NCAA College Cup. Grening is a technically skilled offensive player with a keen eye for forward play. He excels at challenging opponents one-on-one and can often be a game-changer through his ability to create chances and deliver decisive actions.",
      da: "Casper Grening kommer fra FC Roskildes ungdomsakademi og har siden spillet college-fodbold i USA for både University of Kentucky og University of Pittsburgh. Med Pittsburgh Panthers var han med til at føre holdet til de prestigefyldte 'Elite Eight' i NCAA College Cup. Grening er en teknisk dygtig offensiv spiller med et skarpt blik for fremadrettet spil. Han er fremragende til at udfordre modstandere i én-mod-én og kan ofte være afgørende med sin evne til at skabe chancer og levere afgørende aktioner.",
    },
  },
  {
    siPlayerId: 1163786,
    displayNameOverride: 'Milan Silva Rasmussen',
    formerClubs: 'B.93, Helsingborgs IF, HIK',
    bio: {
      en: "A fun fact about Milan is that he's half Brazilian. In his spare time, he enjoys quality time with friends and family.",
      da: 'En sjov kendsgerning om Milan er, at han er halvt brasiliansk. I fritiden nyder han at tilbringe tid med venner og familie.',
    },
    quote: {
      en: "I've always believed that if you put in the work the results will come.",
      da: 'Jeg har altid troet på, at hvis du lægger arbejdet, kommer resultaterne.',
    },
  },
  {
    siPlayerId: 1513662,
    nickname: 'Matty',
    formerClubs: 'BK Frem, B93',
    bio: {
      en: "Jonathan is one of the young offensive talents who was brought to the club in the summer of 2025. At youth level, he scored 48 goals in 55 games for B93, and it only took him 3 games before he found the back of the net for AB, becoming the match winner against Ishøj. He is a player who, with his strength, speed and sharp finishing, will be a threat to any defense. In his free time, Mathys enjoys a game of golf or a trip to the sauna, and he's a self-proclaimed foodie. His great source of inspiration is Cristiano Ronaldo.",
      da: 'Jonathan er et af de unge offensive talenter, der kom til klubben i sommeren 2025. På ungdomsniveau scorede han 48 mål i 55 kampe for B93, og det tog ham kun 3 kampe, inden han satte bolden i nettet for AB og blev matchvinder mod Ishøj. Han er en spiller, som med sin styrke, fart og skarpe afslutning vil være en trussel mod enhver forsvar. I fritiden nyder Mathys en golfrunde eller en tur i saunaen og er en erklæret madentusiast. Hans store inspirationskilde er Cristiano Ronaldo.',
    },
    quote: {
      en: 'I love playing football. I love the grind, the journey, and watching myself get better every single day. I love scoring goals and winning with the team. I want to be the best version of myself.',
      da: 'Jeg elsker at spille fodbold. Jeg elsker slæbet, rejsen og at se mig selv blive bedre hver eneste dag. Jeg elsker at score mål og vinde med holdet. Jeg vil være den bedste version af mig selv.',
    },
  },
  {
    siPlayerId: 1651493,
    nickname: 'Immer',
    formerClubs: 'Thisted FC',
    bio: {
      en: "Marcus Immersen comes from Thisted's academy and plays as a striker. He has good size, speed, and physical strength, making him a constant offensive threat. His willingness to run and high intensity mean that he remains active throughout the entire game and contributes to the team's offensive actions. On the field, he works purposefully in all situations and always gives his full contribution to the team.",
      da: 'Marcus Immersen kommer fra Thistedakademiet og spiller som angriber. Han har god størrelse, fart og fysisk styrke, hvilket gør ham til en konstant offensiv trussel. Hans løbevillighed og høje intensitet betyder, at han forbliver aktiv gennem hele kampen og bidrager til holdets offensive aktioner. På banen arbejder han målrettet i alle situationer og giver altid sit fulde bidrag til holdet.',
    },
    quote: {
      en: 'I am ready to fight with everything I have for this club',
      da: 'Jeg er klar til at kæmpe med alt, hvad jeg har, for denne klub',
    },
  },
  {
    siPlayerId: 1576734,
    positionOverride: 'defender', // SI API has him as forward
    nickname: 'Freddy',
    formerClubs: 'AB U19',
    bio: {
      en: "Frederik is one of several players who has made the journey from our own academy up to the senior squad. He is a player who, in addition to his speed, also brings great power and intensity to the game. In the dressing room, Frederik brings a lot of good energy, and he also makes sure his teammates look sharp — he is also the team's hairdresser. His great source of inspiration is Cristiano Ronaldo and his great discipline.",
      da: 'Frederik er en af flere spillere, der har gjort rejsen fra vores eget akademi op til seniorholdet. Han er en spiller, der ud over sin fart også bringer stor styrke og intensitet til spillet. I omklædningsrummet tilfører Frederik masser af god energi og sørger også for, at hans holdkammerater ser skarpe ud — han er også holdets frisør. Hans store inspirationskilde er Cristiano Ronaldo og hans store disciplin.',
    },
    quote: {
      en: 'Hard work beats talent',
      da: 'Hårdt arbejde slår talent',
    },
  },
  {
    siPlayerId: 1693327,
    nickname: 'Spacey',
    formerClubs: 'AB U19',
    bio: {
      en: "Tobias Hageltorn switched from youth football to senior football at the end of 2024 when he signed his first professional contract with AB. Hageltorn is both a strong and very unpredictable football player. The great idols in his life are his father and Cristiano Ronaldo — according to Tobias they are 'the greatest of all time'. Off the pitch, he enjoys spending time with his family, and as a fun fact, he once lived in Tennessee in the USA.",
      da: "Tobias Hageltorn skiftede fra ungdomsfodbold til seniorfodbold i slutningen af 2024, da han skrev under på sin første professionelle kontrakt med AB. Hageltorn er både en stærk og meget uforudsigelig fodboldspiller. De store idoler i hans liv er hans far og Cristiano Ronaldo — ifølge Tobias er de 'de bedste nogensinde'. Uden for banen nyder han at tilbringe tid med sin familie, og som en sjov kendsgerning boede han engang i Tennessee i USA.",
    },
    quote: {
      en: "Don't doubt yourself",
      da: 'Tro på dig selv',
    },
  },
  {
    siPlayerId: 1339202,
    positionOverride: 'forward', // SI API has him as defender
    nickname: 'O',
    formerClubs: 'New York Red Bulls',
    bio: {
      en: 'Mullings joined AB at the beginning of 2024 and has since been one of the profiles on the team. With his dynamic play, pace and technique, he is a threat to whoever he faces. His role models are Eden Hazard and Ousmane Dembele, who also possess many of the same key skills. In his spare time, Mullings is interested in fashion and cooking, and when time allows, he also enjoys traveling and experiencing the world. Mullings also has an artistic side — he has a hidden talent for drawing.',
      da: 'Mullings tiltrådte AB i starten af 2024 og er siden blevet en af holdets profiler. Med sit dynamiske spil, fart og teknik er han en trussel mod alle, han møder. Hans forbilleder er Eden Hazard og Ousmane Dembele, som også besidder mange af de samme nøglekompetencer. I fritiden er Mullings interesseret i mode og madlavning, og når tiden tillader det, nyder han også at rejse og opleve verden. Mullings har desuden en kunstnerisk side — han har et skjult talent for tegning.',
    },
    quote: {
      en: 'You get one life to enjoy what you do',
      da: 'Du får ét liv til at nyde det, du laver',
    },
  },
  // ── Hide-only rows — no bio/quote data exists for these in
  // PLAYER_CMS_DATA, only a hide flag in src/lib/si/player-photos.ts. Their SI
  // player IDs are NOT yet known — resolve each by looking up the live SI
  // roster (GET /players?teamId=...) for the given name/shirt number and fill
  // in `siPlayerId` before running this script. Do this promptly: shirt
  // numbers can be reassigned before the lookup happens.
  // { siPlayerId: TODO, hideFromSquad: true }, // Daniel A. Pedersen — EXCLUDED_PLAYER_SLUGS
  // { siPlayerId: TODO, hideFromSquad: true }, // Anton Boye — EXCLUDED_PLAYER_SLUGS
  // { siPlayerId: TODO, hidePhoto: true }, // Gabriel Noga, #14 — PENDING_PHOTO_SHIRT_NUMBERS
];

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${STRAPI_API_TOKEN}`, ...extra };
}

async function strapiJson(pathname, options = {}) {
  const res = await fetch(`${STRAPI_URL}${pathname}`, {
    ...options,
    headers: authHeaders({
      'Content-Type': 'application/json',
      ...options.headers,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `${options.method ?? 'GET'} ${pathname} -> ${res.status} ${await res.text()}`
    );
  }
  return res.status === 204 ? null : res.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// `status=draft` (not `published`) — every document has a draft version, but
// not necessarily a published one, so this is the only status filter
// guaranteed to find a document regardless of whether an earlier run created
// it but failed before publishing.
async function findExistingDocumentId(siPlayerId) {
  const res = await strapiJson(
    `/api/players?filters[siPlayerId][$eq]=${siPlayerId}&locale=da&status=draft`
  );
  return res.data[0]?.documentId ?? null;
}

async function seedOne(entry) {
  console.log(`\nSI player ${entry.siPlayerId}`);

  const data = {
    siPlayerId: entry.siPlayerId,
    ...(entry.nickname && { nickname: entry.nickname }),
    ...(entry.formerClubs && { formerClubs: entry.formerClubs }),
    ...(entry.bio?.da && { bio: entry.bio.da }),
    ...(entry.quote?.da && { quote: entry.quote.da }),
    ...(entry.displayNameOverride && {
      displayNameOverride: entry.displayNameOverride,
    }),
    ...(entry.shirtNumberOverride != null && {
      shirtNumberOverride: entry.shirtNumberOverride,
    }),
    ...(entry.positionOverride && { positionOverride: entry.positionOverride }),
    ...(entry.hideFromSquad && { hideFromSquad: true }),
    ...(entry.hidePhoto && { hidePhoto: true }),
  };

  const existingId = await findExistingDocumentId(entry.siPlayerId);

  // `status=published` on the write itself both creates/updates AND publishes
  // in one call — Strapi's public content-api (token-auth) routes don't expose
  // the content-manager's /actions/publish endpoint (that's admin-session-only).
  let documentId;
  if (existingId) {
    await strapiJson(`/api/players/${existingId}?locale=da&status=published`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
    documentId = existingId;
    console.log(`  updated existing entry (${documentId})`);
  } else {
    const created = await strapiJson(
      '/api/players?locale=da&status=published',
      {
        method: 'POST',
        body: JSON.stringify({ data }),
      }
    );
    documentId = created.data.documentId;
    console.log(`  created new entry (${documentId})`);
  }

  // Create/refresh the EN locale row — non-localized fields (siPlayerId,
  // nickname, formerClubs, overrides) carry over automatically; only
  // bio/quote need their own English text.
  await strapiJson(`/api/players/${documentId}?locale=en&status=published`, {
    method: 'PUT',
    body: JSON.stringify({
      data: {
        ...data,
        ...(entry.bio?.en && { bio: entry.bio.en }),
        ...(entry.quote?.en && { quote: entry.quote.en }),
      },
    }),
  });
  console.log('  synced en locale');
}

let ok = 0;
let failed = 0;
for (const entry of PLAYERS) {
  try {
    await seedOne(entry);
    ok++;
  } catch (err) {
    failed++;
    console.error(`  FAILED: ${err.message}`);
  }
  // Mirrors seed-partners.mjs's pacing — avoids bursting Strapi Cloud's
  // sandbox tier with back-to-back writes.
  await sleep(500);
}

console.log(`\nDone. ${ok} seeded, ${failed} failed.`);
if (failed > 0) process.exit(1);
