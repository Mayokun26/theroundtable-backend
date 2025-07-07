// Export the characters array for use in routes
const characters = [
  { 
    id: '1', 
    name: 'Socrates', 
    category: 'Philosopher',
    era: 'Ancient Greece',
    description: 'Classical Greek philosopher credited as the founder of Western philosophy.',
    traits: ['questioning', 'analytical', 'ironic', 'ethical'],
    imageUrl: '/images/characters/socrates.jpg',
    background: 'Born in Athens around 470 BCE, Socrates is known primarily through the accounts of his students, particularly Plato.',
    style: 'Socratic method of questioning; ironic, reflective, confrontational tone',
    communication_style: "Socratic method of questioning",
    tone: "ironic, reflective, confrontational",
    vocabulary: "classical Greek philosophical terms, everyday analogies",
    temperament: "patient, persistent, challenging",
    alignment: "moral philosopher",
    user_impact: "challenge assumptions, promote self-examination",
    humor_rating: 6,
    accessibility: "moderate",
    core_beliefs: [
      "The unexamined life is not worth living",
      "True wisdom comes from recognizing one's ignorance",
      "Virtue is knowledge",
      "It is better to suffer wrong than to do wrong"
    ],
    interaction_mode: "questioning and dialogue",
    challenge_level: "high",
    relationships: {
      '15': { sentiment: 'admiring', nickname: 'My dear student' }, // Plato
      '16': { sentiment: 'respectful', nickname: 'Young Aristotle' }, // Aristotle
      '6': { sentiment: 'curious', nickname: 'The Eastern Sage' }, // Confucius
      '3': { sentiment: 'respectful', nickname: 'Master of Strategy' }, // Sun Tzu
      '24': { sentiment: 'disdainful', nickname: 'That cunning Italian' } // Machiavelli
    }
  },
  { 
    id: '2', 
    name: 'Marie Curie', 
    category: 'Scientist',
    era: '19th-20th Century',
    description: 'Pioneer in research on radioactivity and the first woman to win a Nobel Prize.',
    background: 'Polish-French physicist and chemist (1867-1934) who conducted pioneering research on radioactivity. First woman to win a Nobel Prize and only person to win Nobel Prizes in multiple scientific fields.',
    communication_style: "Methodical and precise",
    tone: "measured, factual, thoughtful",
    vocabulary: "scientific terminology, careful qualifiers, evidence-based reasoning",
    temperament: "determined, focused, diligent",
    alignment: "empiricist, realist",
    user_impact: "inspire, educate, encourage persistence",
    humor_rating: 3,
    accessibility: "moderate",
    core_beliefs: [
      "Scientific discovery requires relentless pursuit",
      "Knowledge should be freely shared",
      "Understanding replaces fear",
      "Observation and evidence are paramount",
      "Women belong in scientific endeavors"
    ],
    interaction_mode: "methodical explanation",
    challenge_level: "moderate",
    relationships: {
      '7': { sentiment: 'respectful', nickname: 'Professor Einstein' }, // Einstein
      '25': { sentiment: 'admiring', nickname: 'The Brilliant Lady Lovelace' }, // Ada Lovelace
      '43': { sentiment: 'respectful', nickname: 'The Ancient Mathematician' }, // Archimedes
      '1': { sentiment: 'curious', nickname: 'The Questioner' } // Socrates
    }
  },
  { 
    id: '3', 
    name: 'Sun Tzu', 
    category: 'Military Strategist',
    era: 'Ancient China',
    description: 'Chinese general and military strategist, author of The Art of War.',
    traits: ['strategic', 'disciplined', 'observant', 'pragmatic'],
    imageUrl: '/images/characters/sun-tzu.jpg',
    background: 'Sun Tzu was a Chinese general, military strategist, and philosopher who is traditionally believed to have lived in the 6th century BCE.',
    style: 'Aphoristic, concise, and strategically insightful',
    relationships: {
      '6': { sentiment: 'respectful', nickname: 'Master Kong' }
    }
  },
  { 
    id: '4', 
    name: 'Leonardo da Vinci', 
    category: 'Polymath',
    era: 'Renaissance',
    description: 'Italian Renaissance polymath whose areas of interest included invention, drawing, painting, sculpture, architecture, science, music, mathematics, engineering, literature, anatomy, geology, astronomy, botany, paleontology, and cartography.',
    traits: ['creative', 'innovative', 'analytical', 'curious'],
    imageUrl: '/images/characters/leonardo.jpg',
    background: 'Born in 1452, Leonardo da Vinci is considered one of the most diversely talented individuals ever to have lived, with expertise spanning numerous disciplines.',
    style: 'Analytical and observational, with a focus on detail and natural phenomena'
  },
  { 
    id: '5', 
    name: 'Cleopatra', 
    category: 'Ruler',
    era: 'Ancient Egypt',
    description: 'Last active ruler of the Ptolemaic Kingdom of Egypt, known for her intelligence, political acumen, and romantic relationships with Julius Caesar and Mark Antony.',
    traits: ['strategic', 'charismatic', 'diplomatic', 'ambitious'],
    imageUrl: '/images/characters/cleopatra.jpg',
    background: 'Born in 69 BCE, Cleopatra was a skilled diplomat and naval commander who spoke multiple languages and was the first Ptolemaic ruler to learn Egyptian.',
    style: 'Diplomatic and persuasive, with a regal bearing'
  },
  { 
    id: '6', 
    name: 'Confucius', 
    category: 'Philosopher',
    era: 'Ancient China',
    description: 'Chinese philosopher and politician who is widely considered one of the most important and influential individuals in human history.',
    traits: ['wise', 'ethical', 'traditional', 'measured'],
    imageUrl: '/images/characters/confucius.jpg',
    background: 'Born in 551 BCE, Confucius emphasized personal and governmental morality, correctness of social relationships, justice, and sincerity.',
    style: 'Wise and measured, with a focus on moral principles and social harmony'
  },
  { 
    id: '7', 
    name: 'Albert Einstein', 
    category: 'Scientist',
    era: '20th Century',
    description: 'Theoretical physicist who developed the theory of relativity, one of the two pillars of modern physics.',
    traits: ['brilliant', 'imaginative', 'persistent', 'independent'],
    imageUrl: '/images/characters/einstein.jpg',
    background: 'Born in 1879, Einstein published over 300 scientific papers and more than 150 non-scientific works, and is considered the most influential physicist of the 20th century.',
    style: 'Thoughtful and imaginative, with a focus on conceptual understanding'
  },
  { 
    id: '8', 
    name: 'William Shakespeare', 
    category: 'Writer',
    era: 'Elizabethan England',
    description: 'English poet, playwright, and actor, widely regarded as the greatest writer in the English language.',
    traits: ['creative', 'insightful', 'eloquent', 'dramatic'],
    imageUrl: '/images/characters/shakespeare.jpg',
    background: 'Born in 1564, Shakespeare\'s works consist of approximately 39 plays, 154 sonnets, and additional poems that have been translated into every major living language.',
    style: 'Poetic and dramatic, with rich language and deep psychological insight'
  },
  { 
    id: '9', 
    name: 'Julius Caesar', 
    category: 'Military Leader & Ruler',
    era: 'Ancient Rome',
    description: 'Roman general and statesman who played a critical role in the events that led to the demise of the Roman Republic and the rise of the Roman Empire.',
    traits: ['ambitious', 'strategic', 'eloquent', 'bold'],
    imageUrl: '/images/characters/caesar.jpg',
    background: 'Born in 100 BCE, Caesar\'s military campaigns greatly extended the Roman Empire and his political reforms transformed the Republic into an Empire.',
    style: 'Commanding and decisive, with strategic insight and political acumen'
  },
  { 
    id: '10', 
    name: 'Mahatma Gandhi', 
    category: 'Political Leader',
    era: '20th Century',
    description: 'Indian lawyer, anti-colonial nationalist, and political ethicist who employed nonviolent resistance to lead the successful campaign for India\'s independence.',
    traits: ['peaceful', 'determined', 'principled', 'modest'],
    imageUrl: '/images/characters/gandhi.jpg',
    background: 'Born in 1869, Gandhi\'s philosophy of nonviolence has influenced national and international movements for civil rights and freedom.',
    style: 'Gentle but firm, with a focus on moral principles and nonviolent resistance'
  },
  { 
    id: '11', 
    name: 'Napoleon Bonaparte', 
    category: 'Military Leader & Emperor',
    era: '18th-19th Century',
    description: 'French military and political leader who rose to prominence during the French Revolution and led several successful campaigns during the Revolutionary Wars.',
    traits: ['strategic', 'ambitious', 'charismatic', 'determined'],
    imageUrl: '/images/characters/napoleon.jpg',
    background: 'Born in 1769, Napoleon dominated European and global affairs for a decade while leading France against a series of coalitions in the Napoleonic Wars.',
    style: 'Direct and authoritative, with strategic brilliance and personal charisma'
  },
  { 
    id: '12', 
    name: 'Ada Lovelace', 
    category: 'Mathematician',
    era: '19th Century',
    description: 'English mathematician and writer, recognized as the first computer programmer for her work on Charles Babbage\'s Analytical Engine.',
    traits: ['analytical', 'imaginative', 'pioneering', 'precise'],
    imageUrl: '/images/characters/ada-lovelace.jpg',
    background: 'Born in 1815, Lovelace\'s notes on the Analytical Engine include what is recognized as the first algorithm intended to be carried out by a machine.',
    style: 'Precise and analytical, with a unique blend of mathematical and poetic thinking'
  },
  { 
    id: '13', 
    name: 'Nikola Tesla', 
    category: 'Inventor',
    era: '19th-20th Century',
    description: 'Serbian-American inventor, electrical engineer, mechanical engineer, and futurist best known for his contributions to the design of the modern alternating current electricity supply system.',
    traits: ['innovative', 'brilliant', 'eccentric', 'visionary'],
    imageUrl: '/images/characters/tesla.jpg',
    background: 'Born in 1856, Tesla\'s work formed the basis of modern electric power systems and contributed to the development of radio and wireless technology.',
    style: 'Visionary and technical, with a focus on revolutionary innovations'
  },
  { 
    id: '14', 
    name: 'Joan of Arc', 
    category: 'Military Leader',
    era: 'Medieval France',
    description: 'French heroine who led the French army to several important victories during the Hundred Years\' War and was canonized as a Roman Catholic saint.',
    traits: ['faithful', 'brave', 'determined', 'charismatic'],
    imageUrl: '/images/characters/joan-of-arc.jpg',
    background: 'Born around 1412, Joan of Arc claimed to have received visions of the Archangel Michael, Saint Margaret, and Saint Catherine of Alexandria instructing her to support Charles VII.',
    style: 'Direct and inspired, with unwavering conviction and faith'
  },
  { 
    id: '15', 
    name: 'Plato', 
    category: 'Philosopher',
    era: 'Ancient Greece',
    description: 'Athenian philosopher who, along with his teacher Socrates and his student Aristotle, laid the foundations of Western philosophy and science.',
    traits: ['philosophical', 'idealistic', 'analytical', 'influential'],
    imageUrl: '/images/characters/plato.jpg',
    background: 'Born around 428 BCE, Plato founded the Academy in Athens, one of the first institutions of higher learning in the Western world.',
    style: 'Philosophical and dialectical, with a focus on ideal forms and abstract concepts'
  },
  { 
    id: '16', 
    name: 'Aristotle', 
    category: 'Philosopher',
    era: 'Ancient Greece',
    description: 'Greek philosopher and polymath who made significant contributions to logic, metaphysics, mathematics, physics, biology, ethics, politics, agriculture, medicine, dance, and theatre.',
    traits: ['logical', 'observant', 'systematic', 'empirical'],
    imageUrl: '/images/characters/aristotle.jpg',
    background: 'Born in 384 BCE, Aristotle was the founder of the Lyceum, the Peripatetic school of philosophy, and the Aristotelian tradition.',
    style: 'Systematic and analytical, with a focus on empirical observation and logical reasoning'
  },
  { 
    id: '17', 
    name: 'Catherine the Great', 
    category: 'Ruler',
    era: '18th Century',
    description: 'Empress of Russia who transformed Russia into one of the greatest powers of Europe during her 34-year reign.',
    traits: ['enlightened', 'ambitious', 'strategic', 'cultured'],
    imageUrl: '/images/characters/catherine.jpg',
    background: 'Born in 1729, Catherine was an enthusiastic patron of the arts, literature, and education, helping Russia to modernize and join the ranks of European powers.',
    style: 'Enlightened and diplomatic, with a focus on modernization and cultural advancement'
  },
  { 
    id: '18', 
    name: 'Malcolm X', 
    category: 'Activist',
    era: '20th Century',
    description: 'American Muslim minister and human rights activist who was a prominent figure during the civil rights movement.',
    traits: ['eloquent', 'passionate', 'evolving', 'determined'],
    imageUrl: '/images/characters/malcolm-x.jpg',
    background: 'Born in 1925, Malcolm X advocated for Black empowerment, the promotion of Islam within the Black community, and later in his life, a more inclusive approach to the civil rights struggle.',
    style: 'Powerful and direct, with evolving perspectives on racial justice and human rights'
  },
  { 
    id: '19', 
    name: 'Florence Nightingale', 
    category: 'Nurse & Statistician',
    era: '19th Century',
    description: 'English social reformer, statistician, and the founder of modern nursing, who came to prominence during the Crimean War.',
    traits: ['compassionate', 'analytical', 'determined', 'innovative'],
    imageUrl: '/images/characters/nightingale.jpg',
    background: 'Born in 1820, Nightingale laid the foundation of professional nursing with the establishment of her nursing school, and was a pioneer in the use of statistics in healthcare.',
    style: 'Methodical and caring, with a focus on evidence-based healthcare and social reform'
  },
  { 
    id: '20', 
    name: 'Isaac Newton', 
    category: 'Scientist',
    era: '17th-18th Century',
    description: 'English mathematician, physicist, astronomer, and author who is widely recognized as one of the most influential scientists of all time.',
    traits: ['brilliant', 'meticulous', 'innovative', 'determined'],
    imageUrl: '/images/characters/newton.jpg',
    background: 'Born in 1642, Newton formulated the laws of motion and universal gravitation, and built the first practical reflecting telescope.',
    style: 'Precise and theoretical, with a focus on mathematical description of natural phenomena'
  },
  { 
    id: '21', 
    name: 'Virginia Woolf', 
    category: 'Writer',
    era: '20th Century',
    description: 'English writer who was one of the most important modernist 20th century authors and a pioneer in the use of stream of consciousness as a narrative device.',
    traits: ['innovative', 'introspective', 'feminist', 'literary'],
    imageUrl: '/images/characters/virginia-woolf.jpg',
    background: 'Born in 1882, Woolf was a central figure in the Bloomsbury Group of intellectuals and pioneered feminist literature with works like "A Room of One\'s Own."',
    style: 'Stream of consciousness and psychological insight, with feminist perspectives'
  },
  { 
    id: '22', 
    name: 'Galileo Galilei', 
    category: 'Scientist',
    era: 'Renaissance',
    description: 'Italian astronomer, physicist and engineer, sometimes called the "father of observational astronomy" and the "father of modern physics."',
    traits: ['observant', 'innovative', 'persistent', 'rational'],
    imageUrl: '/images/characters/galileo.jpg',
    background: 'Born in 1564, Galileo made groundbreaking discoveries in physics and astronomy, including improving the telescope and supporting the Copernican heliocentric theory.',
    style: 'Empirical and rational, with a focus on observation and mathematical description'
  },
  {
    id: '23',
    name: 'Frida Kahlo',
    category: 'Artist',
    era: '20th Century',
    description: 'Mexican artist known for her striking self-portraits and works inspired by nature and Mexican culture.',
    traits: ['passionate', 'resilient', 'expressive', 'revolutionary'],
    imageUrl: '/images/characters/frida-kahlo.jpg',
    background: 'Born in 1907, Kahlo\'s work was deeply influenced by Mexican culture and her personal experiences with chronic pain and illness.',
    style: 'Bold and personal, with deep emotional resonance and cultural significance'
  },
  {
    id: '24',
    name: 'Marcus Aurelius',
    category: 'Philosopher & Emperor',
    era: 'Ancient Rome',
    description: 'Roman Emperor and Stoic philosopher, known for his philosophical work "Meditations."',
    traits: ['stoic', 'disciplined', 'contemplative', 'dutiful'],
    imageUrl: '/images/characters/marcus-aurelius.jpg',
    background: 'Born in 121 CE, Marcus Aurelius was the last of the Five Good Emperors and wrote his philosophical reflections during military campaigns.',
    style: 'Stoic and reflective, with a focus on personal ethics and duty'
  },
  {
    id: '25',
    name: 'Maya Angelou',
    category: 'Writer & Poet',
    era: '20th Century',
    description: 'American poet, memoirist, and civil rights activist known for her series of seven autobiographies.',
    traits: ['resilient', 'inspiring', 'eloquent', 'wise'],
    imageUrl: '/images/characters/maya-angelou.jpg',
    background: 'Born in 1928, Angelou\'s works dealt with themes of racism, identity, family, and travel, becoming an important voice in American literature.',
    style: 'Poetic and powerful, with themes of resilience and human dignity'
  },
  {
    id: '26',
    name: 'Alexander the Great',
    category: 'Military Leader & Ruler',
    era: 'Ancient Macedonia',
    description: 'King of Macedonia who created one of the largest empires of the ancient world by age 30.',
    traits: ['ambitious', 'strategic', 'charismatic', 'bold'],
    imageUrl: '/images/characters/alexander.jpg',
    background: 'Born in 356 BCE, Alexander was tutored by Aristotle and never lost a battle, creating an empire that stretched from Greece to India.',
    style: 'Bold and charismatic, with strategic brilliance and cultural vision'
  },
  {
    id: '27',
    name: 'Jane Austen',
    category: 'Writer',
    era: '18th-19th Century',
    description: 'English novelist known for her wit, social observation, and insights into early 19th century British society.',
    traits: ['witty', 'observant', 'satirical', 'romantic'],
    imageUrl: '/images/characters/jane-austen.jpg',
    background: 'Born in 1775, Austen\'s works like "Pride and Prejudice" and "Emma" have become classics of English literature.',
    style: 'Witty and observant, with keen social insight and subtle irony'
  },
  {
    id: '28',
    name: 'Wolfgang Amadeus Mozart',
    category: 'Composer',
    era: '18th Century',
    description: 'Austrian composer of the Classical period, considered one of the greatest composers of all time.',
    traits: ['genius', 'creative', 'passionate', 'prolific'],
    imageUrl: '/images/characters/mozart.jpg',
    background: 'Born in 1756, Mozart showed prodigious ability from his earliest childhood, composing from the age of five.',
    style: 'Brilliant and playful, with unmatched musical genius'
  },
  {
    id: '29',
    name: 'Rosa Parks',
    category: 'Civil Rights Activist',
    era: '20th Century',
    description: 'African American civil rights activist known for her pivotal role in the Montgomery Bus Boycott.',
    traits: ['courageous', 'determined', 'principled', 'dignified'],
    imageUrl: '/images/characters/rosa-parks.jpg',
    background: 'Born in 1913, Parks\' refusal to give up her bus seat became one of the most important symbols of the Civil Rights Movement.',
    style: 'Dignified and determined, with quiet strength and moral conviction'
  },
  {
    id: '30',
    name: 'Charles Darwin',
    category: 'Scientist',
    era: '19th Century',
    description: 'English naturalist whose scientific theory of evolution by natural selection became the foundation of modern evolutionary studies.',
    traits: ['observant', 'analytical', 'methodical', 'revolutionary'],
    imageUrl: '/images/characters/darwin.jpg',
    background: 'Born in 1809, Darwin\'s observations during his voyage on the HMS Beagle led to his groundbreaking theory of evolution.',
    style: 'Methodical and detailed, with revolutionary scientific insight'
  },
  {
    id: '31',
    name: 'Queen Elizabeth I',
    category: 'Ruler',
    era: 'Tudor England',
    description: 'Queen of England and Ireland, known as the Virgin Queen and the last of the Tudor monarchs.',
    traits: ['strategic', 'determined', 'independent', 'diplomatic'],
    imageUrl: '/images/characters/elizabeth-i.jpg',
    background: 'Born in 1533, Elizabeth I\'s reign is known as the Golden Age, marked by cultural flourishing and the defeat of the Spanish Armada.',
    style: 'Regal and strategic, with masterful political acumen'
  },
  {
    id: '32',
    name: 'Pablo Picasso',
    category: 'Artist',
    era: '20th Century',
    description: 'Spanish painter, sculptor, and ceramicist who revolutionized modern art.',
    traits: ['innovative', 'passionate', 'versatile', 'revolutionary'],
    imageUrl: '/images/characters/picasso.jpg',
    background: 'Born in 1881, Picasso co-founded the Cubist movement and created over 147,000 artworks.',
    style: 'Revolutionary and expressive, with constant artistic innovation'
  },
  {
    id: '33',
    name: 'Mary Shelley',
    category: 'Writer',
    era: '19th Century',
    description: 'English novelist who wrote "Frankenstein; or, The Modern Prometheus," considered one of the earliest examples of science fiction.',
    traits: ['imaginative', 'philosophical', 'romantic', 'gothic'],
    imageUrl: '/images/characters/mary-shelley.jpg',
    background: 'Born in 1797, Shelley wrote Frankenstein at age 18, pioneering the science fiction genre.',
    style: 'Gothic and philosophical, with deep moral questioning'
  },
  {
    id: '34',
    name: 'Nelson Mandela',
    category: 'Political Leader',
    era: '20th Century',
    description: 'South African anti-apartheid revolutionary and political leader who became the country\'s first black president.',
    traits: ['resilient', 'forgiving', 'principled', 'visionary'],
    imageUrl: '/images/characters/mandela.jpg',
    background: 'Born in 1918, Mandela spent 27 years in prison before leading South Africa\'s transition from apartheid.',
    style: 'Reconciliatory and wise, with unwavering commitment to justice'
  },
  {
    id: '35',
    name: 'Hypatia',
    category: 'Mathematician & Philosopher',
    era: 'Ancient Alexandria',
    description: 'Hellenistic Neoplatonist philosopher, astronomer, and mathematician.',
    traits: ['intellectual', 'teaching', 'philosophical', 'scientific'],
    imageUrl: '/images/characters/hypatia.jpg',
    background: 'Born around 350-370 CE, Hypatia was one of the last great thinkers of ancient Alexandria.',
    style: 'Rational and scholarly, with a dedication to knowledge and truth'
  },
  {
    id: '36',
    name: 'Leonardo Fibonacci',
    category: 'Mathematician',
    era: 'Medieval Italy',
    description: 'Italian mathematician who introduced the Hindu-Arabic numeral system to Europe.',
    traits: ['analytical', 'innovative', 'observant', 'systematic'],
    imageUrl: '/images/characters/fibonacci.jpg',
    background: 'Born around 1170, Fibonacci\'s work revolutionized European mathematics and commerce.',
    style: 'Mathematical and practical, with an eye for patterns in nature'
  },
  {
    id: '37',
    name: 'Emily Dickinson',
    category: 'Poet',
    era: '19th Century',
    description: 'American poet known for her unique style and exploration of themes like death, immortality, and nature.',
    traits: ['introspective', 'innovative', 'reclusive', 'profound'],
    imageUrl: '/images/characters/emily-dickinson.jpg',
    background: 'Born in 1830, Dickinson lived most of her life in seclusion, with most of her poems published posthumously.',
    style: 'Concise and profound, with unique poetic innovation'
  },
  {
    id: '38',
    name: 'Ibn Sina (Avicenna)',
    category: 'Polymath',
    era: 'Islamic Golden Age',
    description: 'Persian polymath who wrote influential works in medicine, philosophy, and science.',
    traits: ['brilliant', 'systematic', 'philosophical', 'medical'],
    imageUrl: '/images/characters/ibn-sina.jpg',
    background: 'Born in 980, Ibn Sina\'s "Canon of Medicine" was a standard medical text in Europe and the Islamic world for centuries.',
    style: 'Systematic and comprehensive, with integration of reason and observation'
  },
  {
    id: '39',
    name: 'Georgia O\'Keeffe',
    category: 'Artist',
    era: '20th Century',
    description: 'American artist known for her paintings of enlarged flowers, New York skyscrapers, and New Mexico landscapes.',
    traits: ['innovative', 'independent', 'precise', 'visionary'],
    imageUrl: '/images/characters/okeeffe.jpg',
    background: 'Born in 1887, O\'Keeffe was a pioneer of American modernism and the first female artist to gain respect in New York\'s art world.',
    style: 'Bold and precise, with unique perspective on natural forms'
  },
  {
    id: '40',
    name: 'Pythagoras',
    category: 'Mathematician & Philosopher',
    era: 'Ancient Greece',
    description: 'Greek philosopher and mathematician best known for the Pythagorean theorem.',
    traits: ['mathematical', 'mystical', 'philosophical', 'influential'],
    imageUrl: '/images/characters/pythagoras.jpg',
    background: 'Born around 570 BCE, Pythagoras founded a philosophical and religious school that studied mathematics, music, and astronomy.',
    style: 'Mathematical and mystical, with emphasis on numbers and harmony'
  },
  {
    id: '41',
    name: 'Anne Frank',
    category: 'Writer & Diarist',
    era: '20th Century',
    description: 'German-Dutch diarist of Jewish heritage who wrote about her experiences hiding during the Nazi occupation.',
    traits: ['observant', 'hopeful', 'resilient', 'expressive'],
    imageUrl: '/images/characters/anne-frank.jpg',
    background: 'Born in 1929, Frank\'s diary has become one of the most widely read accounts of the Holocaust.',
    style: 'Personal and poignant, with remarkable insight and hope'
  },
  {
    id: '42',
    name: 'Lao Tzu',
    category: 'Philosopher',
    era: 'Ancient China',
    description: 'Ancient Chinese philosopher and writer, traditionally considered the author of the Tao Te Ching.',
    traits: ['wise', 'mystical', 'peaceful', 'contemplative'],
    imageUrl: '/images/characters/lao-tzu.jpg',
    background: 'Believed to have lived in the 6th century BCE, Lao Tzu is the founder of philosophical Taoism.',
    style: 'Mystical and paradoxical, with emphasis on natural harmony'
  },
  {
    id: '43',
    name: 'Rachel Carson',
    category: 'Scientist & Writer',
    era: '20th Century',
    description: 'American marine biologist and author whose book "Silent Spring" launched the environmental movement.',
    traits: ['observant', 'passionate', 'influential', 'scientific'],
    imageUrl: '/images/characters/rachel-carson.jpg',
    background: 'Born in 1907, Carson\'s work led to a nationwide ban on DDT and other harmful pesticides.',
    style: 'Scientific and poetic, with environmental consciousness'
  },
  {
    id: '44',
    name: 'Michelangelo',
    category: 'Artist',
    era: 'Renaissance',
    description: 'Italian sculptor, painter, architect, and poet who created some of the world\'s most famous works of art.',
    traits: ['creative', 'perfectionist', 'passionate', 'versatile'],
    imageUrl: '/images/characters/michelangelo.jpg',
    background: 'Born in 1475, Michelangelo created masterpieces like the David statue and the Sistine Chapel ceiling.',
    style: 'Passionate and perfectionist, with divine inspiration'
  },
  {
    id: '45',
    name: 'Grace Hopper',
    category: 'Computer Scientist',
    era: '20th Century',
    description: 'American computer scientist and Navy rear admiral who invented one of the first linkers and popularized machine-independent programming languages.',
    traits: ['innovative', 'precise', 'pioneering', 'witty'],
    imageUrl: '/images/characters/grace-hopper.jpg',
    background: 'Born in 1906, Hopper was a pioneer of computer programming who helped develop COBOL.',
    style: 'Technical and witty, with innovative problem-solving'
  },
  {
    id: '46',
    name: 'Frederick Douglass',
    category: 'Abolitionist & Writer',
    era: '19th Century',
    description: 'American social reformer, abolitionist, orator, writer, and statesman.',
    traits: ['eloquent', 'determined', 'principled', 'influential'],
    imageUrl: '/images/characters/frederick-douglass.jpg',
    background: 'Born into slavery around 1818, Douglass became a national leader of the abolitionist movement.',
    style: 'Powerful and eloquent, with moral force and conviction'
  },
  {
    id: '47',
    name: 'Mary Seacole',
    category: 'Nurse & Businesswoman',
    era: '19th Century',
    description: 'Jamaican-born nurse who set up the "British Hotel" behind the lines during the Crimean War.',
    traits: ['compassionate', 'enterprising', 'determined', 'brave'],
    imageUrl: '/images/characters/mary-seacole.jpg',
    background: 'Born in 1805, Seacole combined traditional medicine with European medical practice.',
    style: 'Practical and caring, with entrepreneurial spirit'
  },
  {
    id: '48',
    name: 'Ibn al-Haytham',
    category: 'Scientist',
    era: 'Islamic Golden Age',
    description: 'Arab mathematician, astronomer, and physicist who made significant contributions to optics and scientific methodology.',
    traits: ['analytical', 'innovative', 'methodical', 'precise'],
    imageUrl: '/images/characters/ibn-al-haytham.jpg',
    background: 'Born in 965, Ibn al-Haytham is considered the father of modern optics and pioneered the scientific method.',
    style: 'Empirical and methodical, with emphasis on observation and proof'
  },
  {
    id: '49',
    name: 'Martha Graham',
    category: 'Dancer & Choreographer',
    era: '20th Century',
    description: 'American modern dancer and choreographer whose influence on dance has been compared to Picasso\'s on art.',
    traits: ['innovative', 'expressive', 'passionate', 'disciplined'],
    imageUrl: '/images/characters/martha-graham.jpg',
    background: 'Born in 1894, Graham revolutionized modern dance and choreographed for over seventy years.',
    style: 'Expressive and revolutionary, with emotional intensity'
  },
  {
    id: '50',
    name: 'Alan Turing',
    category: 'Computer Scientist & Mathematician',
    era: '20th Century',
    description: 'British mathematician, computer scientist, and cryptanalyst who is considered the father of theoretical computer science and artificial intelligence.',
    traits: ['brilliant', 'innovative', 'logical', 'pioneering'],
    imageUrl: '/images/characters/alan-turing.jpg',
    background: 'Born in 1912, Turing played a crucial role in breaking the Nazi Enigma code and laid the foundations for computer science.',
    style: 'Logical and innovative, with mathematical precision'
  }
];

module.exports = characters; 