// Datos de los himnos (letras verificadas en himnarios 1893-1914 / hymnary.org).
// abc: número X del archivo all.abc. acordes: plantilla por línea de estrofa; coroAcordes: por línea de coro.
module.exports = [
{
  titulo: 'Santo, Santo, Santo', abc: 1, tonalidad: 'D', compas: '4/4', bpm: 110, categoria: 'Adoración',
  autor: 'Reginald Heber / John B. Dykes · Trad. Juan B. Cabrera (1837-1916)', etiquetas: 'Trinidad, santidad, apertura',
  acordes: [['D','Bm','G','D'], ['D','A','E7','A'], ['D','Bm','G','D'], ['G','D','Em','A7','D']],
  letra: `¡Santo! ¡Santo! ¡Santo! Señor omnipotente,
siempre el labio mío loores te dará.
¡Santo! ¡Santo! ¡Santo! Te adoro reverente,
Dios en tres personas, bendita Trinidad.

¡Santo! ¡Santo! ¡Santo! En numeroso coro,
santos escogidos te adoran sin cesar,
de alegría llenos; y sus coronas de oro
rinden ante el trono y el cristalino mar.

¡Santo! ¡Santo! ¡Santo! La inmensa muchedumbre
de ángeles que cumplen tu santa voluntad,
ante ti se postra, bañada de tu lumbre,
ante ti, que has sido, que eres y serás.

¡Santo! ¡Santo! ¡Santo! Por más que estés velado,
e imposible sea tu gloria contemplar,
santo tú eres solo, y nada hay a tu lado
en poder perfecto, pureza y caridad.

¡Santo! ¡Santo! ¡Santo! La gloria de tu nombre
vemos en tus obras en cielo, tierra y mar;
¡Santo! ¡Santo! ¡Santo! Te adorará todo hombre,
Dios en tres personas, bendita Trinidad.`,
},
{
  titulo: 'Castillo fuerte es nuestro Dios', abc: 2, tonalidad: 'D', compas: '4/4', bpm: 110, categoria: 'Adoración',
  autor: 'Martín Lutero · Trad. Juan B. Cabrera (1837-1916)', etiquetas: 'Reforma, confianza, protección',
  notas: 'Melodía en su forma isorrítmica.',
  acordes: [['D','A','D'], ['G','D','A'], ['D','A','D'], ['G','D','A'], ['D','A'], ['Bm','F#m','G'], ['D','A'], ['Bm','E','A'], ['D','G','A','D']],
  letra: `Castillo fuerte es nuestro Dios,
defensa y buen escudo;
con su poder nos librará
en este trance agudo.
Con furia y con afán
acósanos Satán;
por armas deja ver
astucia y gran poder;
cual él no hay en la tierra.

Nuestro valor es nada aquí,
con él todo es perdido;
mas por nosotros pugnará
de Dios el Escogido.
¿Sabéis quién es? Jesús,
el que venció en la cruz,
Señor de Sabaoth;
y pues él solo es Dios,
él triunfa en la batalla.

Aun si están demonios mil
prontos a devorarnos,
no temeremos, porque Dios
sabrá aún prosperarnos.
Que muestre su vigor
Satán, y su furor;
dañarnos no podrá,
pues condenado es ya
por la Palabra santa.`,
},
{
  titulo: '¡Oh qué amigo nos es Cristo!', abc: 3, tonalidad: 'F', compas: '4/4', bpm: 98, categoria: 'Adoración',
  autor: 'Joseph M. Scriven / Charles C. Converse · Trad. Leandro Garza Mora (1854-1938)', etiquetas: 'oración, consuelo, amistad',
  acordes: [['F','Bb','F'], ['F','C'], ['F','Bb','F'], ['F','C','F'], ['C','G7'], ['C','C7'], ['F','Bb','F'], ['F','C','F']],
  letra: `¡Oh qué amigo nos es Cristo!
Él llevó nuestro dolor,
y nos manda que llevemos
todo a Dios en oración.
¿Vive el hombre desprovisto
de paz, gozo y santo amor?
Esto es porque no llevamos
todo a Dios en oración.

¿Vives débil y cargado
de cuidados y temor?
A Jesús, refugio eterno,
dile todo en oración.
¿Te desprecian tus amigos?
Cuéntaselo en oración;
en sus brazos de amor tierno
paz tendrá tu corazón.

Jesucristo es nuestro amigo:
de esto pruebas él nos dio
al sufrir el cruel castigo
que el culpable mereció.
Y su pueblo redimido
hallará seguridad
fiando en este Amigo eterno
y esperando en su bondad.`,
},
{
  titulo: 'Roca de la eternidad', abc: 4, tonalidad: 'Bb', compas: '3/2', bpm: 145, categoria: 'Semana Santa',
  autor: 'Augustus M. Toplady / Thomas Hastings · Trad. Thomas M. Westrup (1837-1909)', etiquetas: 'cruz, perdón, salvación',
  acordes: [['Bb','F','Bb'], ['Bb','Eb','F','Bb'], ['F','Bb'], ['F','Bb'], ['Bb','F','Bb'], ['Bb','Eb','F','Bb']],
  letra: `Roca de la eternidad,
fuiste abierta para mí;
sé mi escondedero fiel;
solo encuentro paz en ti,
rico, limpio manantial,
en el cual lavado fui.

Aunque fuese siempre fiel,
aunque llore sin cesar,
del pecado no podré
justificación lograr;
solo en ti teniendo fe
deuda tal podré pagar.

Mientras tenga que vivir,
mi último suspiro al dar,
cuando vaya a responder
en tu augusto tribunal,
sé mi escondedero fiel,
Roca de la eternidad.`,
},
{
  titulo: 'Firmes y adelante', abc: 5, tonalidad: 'Eb', compas: '4/4', bpm: 112, categoria: 'Júbilo',
  autor: 'Sabine Baring-Gould / Arthur S. Sullivan · Trad. Juan B. Cabrera (1837-1916)', etiquetas: 'iglesia, perseverancia, victoria',
  notas: 'Cantar el coro después de cada estrofa.',
  acordes: [['Eb'], ['Bb','Eb'], ['Eb','Ab'], ['Bb'], ['Bb'], ['Cm','F'], ['Bb','Eb'], ['Ab','F','Bb']],
  coroAcordes: [['Eb','Ab'], ['Eb','Bb'], ['Eb','Ab'], ['Eb','Bb','Eb']],
  letra: `Firmes y adelante,
huestes de la fe,
sin temor alguno,
que Jesús nos ve.
Jefe soberano,
Cristo al frente va,
y la regia enseña
tremolando está.

Coro:
Firmes y adelante,
huestes de la fe,
sin temor alguno,
que Jesús nos ve.

Al sagrado nombre
de nuestro Adalid,
tiembla el enemigo
y huye de la lid.
Nuestra es la victoria,
dad a Dios loor;
y óigalo el averno
lleno de pavor.

Muévese potente
la Iglesia de Dios;
de los ya gloriosos
marchamos en pos;
somos solo un cuerpo,
y uno es el Señor,
una la esperanza,
y uno nuestro amor.

Tronos y coronas
pueden perecer;
de Jesús la Iglesia
constante ha de ser;
nada en contra suya
prevalecerá,
porque la promesa
nunca faltará.`,
},
{
  titulo: 'Tal como soy', abc: 6, tonalidad: 'D', compas: '3/4', bpm: 120, categoria: 'Adoración',
  autor: 'Charlotte Elliott / William B. Bradbury · Trad. Thomas M. Westrup (1837-1909)', etiquetas: 'invitación, entrega, llamado',
  notas: 'Himno de invitación.',
  acordes: [['D','G','D'], ['D','A'], ['D','G','Bm'], ['D','A7','D']],
  letra: `Tal como soy, de pecador,
sin más confianza que tu amor,
ya que me llamas, acudí;
Cordero de Dios, heme aquí.

Tal como soy, buscando paz
en mi desgracia y mal tenaz,
conflicto grande siento en mí;
Cordero de Dios, heme aquí.

Tal como soy, me acogerás;
perdón y alivio me darás;
pues tu promesa ya creí,
Cordero de Dios, heme aquí.

Tal como soy, tu compasión
vencido ha toda oposición;
ya pertenezco solo a ti:
Cordero de Dios, heme aquí.`,
},
{
  titulo: 'Doxología', abc: 7, tonalidad: 'G', compas: '4/4', bpm: 112, categoria: 'Ofrenda',
  autor: 'Thomas Ken / Louis Bourgeois (Old 100th) · Trad. anónima', etiquetas: 'alabanza, Trinidad, cierre',
  notas: 'Se usa al presentar la ofrenda o al cerrar el culto.',
  acordes: [['G','Em','D','G'], ['G','D','C','G','D'], ['G','D','Em','D','G'], ['G','C','D','G']],
  letra: `A Dios el Padre celestial,
al Hijo, nuestro Redentor,
y al eternal Consolador,
unidos todos alabad.

Cantad al Trino y Uno Dios,
sus alabanzas entonad;
su eterna honra proclamad
con voz de amor y gratitud. Amén.`,
},
{
  titulo: 'Cantad alegres al Señor', abc: 7, tonalidad: 'G', compas: '4/4', bpm: 112, categoria: 'Júbilo',
  autor: 'Tomás J. González Carvajal (1753-1834), Salmo 100 · Música: Louis Bourgeois (Old 100th)', etiquetas: 'Salmo 100, alabanza, gratitud',
  notas: 'Metro largo (8.8.8.8): también se canta con la tonada DUKE STREET.',
  acordes: [['G','Em','D','G'], ['G','D','C','G','D'], ['G','D','Em','D','G'], ['G','C','D','G']],
  letra: `Cantad alegres al Señor,
mortales todos por doquier;
servidle siempre con fervor,
obedecedle con placer.

Con gratitud canción alzad
al Hacedor que el ser os dio;
al Dios excelso venerad,
que como Padre nos amó.

Su pueblo somos: salvará
a sus ovejas el Pastor;
ninguna de ellas faltará
si fueren fieles al Señor.`,
},
{
  titulo: 'Cristo me ama', abc: 8, tonalidad: 'C', compas: '4/4', bpm: 120, categoria: 'Infantil',
  autor: 'Anna B. Warner / William B. Bradbury · Trad. anónima', etiquetas: 'niños, amor de Dios, Biblia',
  notas: 'Cantar el estribillo después de cada estrofa.',
  acordes: [['C','F','C'], ['C','G','C'], ['C','F','C'], ['C','G','C']],
  coroAcordes: [['C','F','C'], ['C','G','C']],
  letra: `Cristo me ama, bien lo sé;
su palabra me hace ver
que los niños son de aquel
quien es nuestro amigo fiel.

Estribillo:
Cristo me ama, Cristo me ama,
Cristo me ama; la Biblia dice así.

Cristo me ama, me salvó,
y en la cruz por mí murió;
mi pecado perdonó;
vida eterna me donó.

Cristo me ama, es verdad,
y me cuida en su bondad;
me conduce el Buen Pastor,
es mi guía y protector.`,
},
{
  titulo: 'Noche de paz', abc: 9, tonalidad: 'Bb', compas: '6/8', bpm: 60, categoria: 'Navidad',
  autor: 'Joseph Mohr / Franz X. Gruber · Trad. Federico Fliedner (1845-1901)', etiquetas: 'nacimiento, paz',
  acordes: [['Bb'], ['F','Bb'], ['Eb','Bb'], ['Eb','Bb'], ['F','Bb'], ['Bb','F','Bb']],
  letra: `Noche de paz, noche de amor.
Todo duerme en derredor.
Entre los astros que esparcen su luz,
bella anunciando al niñito Jesús,
brilla la estrella de paz,
brilla la estrella de paz.

Noche de paz, noche de amor.
Oye humilde, fiel pastor:
coros celestes proclaman salud,
gracias y glorias en gran plenitud,
por nuestro buen Redentor,
por nuestro buen Redentor.

Noche de paz, noche de amor.
Ved qué bello resplandor
luce en el rostro del niño Jesús,
en el pesebre, del mundo la Luz;
astro de eterno fulgor,
astro de eterno fulgor.`,
},
{
  titulo: '¡Al mundo paz!', abc: 10, tonalidad: 'D', compas: '2/4', bpm: 80, categoria: 'Navidad',
  autor: 'Isaac Watts / G. F. Händel, arr. Lowell Mason · Trad. anónima', etiquetas: 'nacimiento, gozo, Rey',
  acordes: [['D','G','A','D'], ['G','A','D'], ['D'], ['D','A'], ['D','A'], ['D','G','A','D']],
  letra: `¡Al mundo paz, nació Jesús!
Nació ya nuestro Rey;
el corazón ya tiene luz,
y paz su santa grey,
y paz su santa grey,
y paz, y paz su santa grey.

¡Al mundo paz, el Salvador
en tierra reinará!
Ya es feliz el pecador,
Jesús perdón le da,
Jesús perdón le da,
Jesús, Jesús perdón le da.

Al mundo él gobernará
con gracia y con poder;
a las naciones mostrará
su amor y su poder,
su amor y su poder,
su amor, su amor y su poder.`,
},
{
  titulo: 'Venid, fieles todos', abc: 11, tonalidad: 'G', compas: '4/4', bpm: 115, categoria: 'Navidad',
  autor: 'Atrib. John F. Wade · Trad. Juan B. Cabrera (1837-1916)', etiquetas: 'nacimiento, adoración',
  notas: 'Con la tonada ADESTE FIDELES se repite "venid, adoremos" tres veces al final de cada estrofa.',
  acordes: [['G','D','G','D'], ['G','D','A','D'], ['G','D','C','D'], ['G','C','D','G']],
  letra: `Venid, fieles todos, a Belén marchemos
de gozo triunfantes, henchidos de amor,
y al Rey de los cielos humilde veremos:
venid, adoremos a Cristo el Señor.

En pobre pesebre yace reclinado,
al hombre ofreciendo eternal salvación,
el santo Mesías, el Verbo humanado:
venid, adoremos a Cristo el Señor.

Cantad jubilosas, célicas criaturas:
resuenan los cielos con vuestra canción;
¡al Dios bondadoso gloria en las alturas!
Venid, adoremos a Cristo el Señor.

Jesús, celebramos tu bendito nombre
con himnos solemnes de grato loor;
por siglos eternos adórete el hombre:
venid, adoremos a Cristo el Señor.`,
},
{
  titulo: 'Oíd un son en alta esfera', abc: 13, tonalidad: 'F', compas: '4/4', bpm: 112, categoria: 'Navidad',
  autor: 'Charles Wesley / Felix Mendelssohn · Trad. Federico Fliedner (1845-1901)', etiquetas: 'nacimiento, ángeles, gloria',
  acordes: [['F','C','F'], ['F','Dm','C'], ['F','Bb','C'], ['F','C','F'], ['F','C'], ['F','C'], ['Bb','F','C'], ['Bb','F','C'], ['Bb','F'], ['F','C','F']],
  letra: `Oíd un son en alta esfera:
"¡En los cielos gloria a Dios,
y al mortal paz en la tierra!"
canta la celeste voz.
Con los cielos alabemos,
al eterno Rey cantemos,
a Jesús, que es nuestro bien,
con el coro de Belén.
Canta la celeste voz:
"¡En los cielos gloria a Dios!"

El Señor de los señores,
el Ungido celestial,
a salvar los pecadores
bajó al seno virginal.
Loor al Verbo encarnado,
en humanidad velado;
gloria al Santo de Israel,
cuyo nombre es Emmanuel.
Canta la celeste voz:
"¡En los cielos gloria a Dios!"

Príncipe de paz eterna,
gloria a ti, Señor Jesús;
entregando el alma tierna,
tú nos traes vida y luz.
Has tu majestad dejado,
y buscarnos te has dignado;
para darnos el vivir,
a la muerte quieres ir.
Canta la celeste voz:
"¡En los cielos gloria a Dios!"`,
},
{
  titulo: '¡Estad por Cristo firmes!', abc: 14, tonalidad: 'Bb', compas: '4/4', bpm: 117, categoria: 'Júbilo',
  autor: 'George Duffield / George J. Webb · Trad. Jaime C. Clifford (1872-1936)', etiquetas: 'perseverancia, servicio, victoria',
  acordes: [['Bb','Eb'], ['Bb','F'], ['Bb','Eb'], ['F','Bb'], ['F','Bb'], ['Eb','C','F'], ['Bb','Eb'], ['F','Bb']],
  letra: `¡Estad por Cristo firmes,
soldados de la cruz!
Alzad hoy la bandera,
en nombre de Jesús.
Es vuestra la victoria,
con él por Capitán;
por él serán vencidas
las huestes de Satán.

¡Estad por Cristo firmes!
Os llama él a la lid;
¡con él, pues, a la lucha,
soldados todos id!
Probad que sois valientes,
luchando contra el mal;
es fuerte el enemigo,
mas Cristo es sin igual.

¡Estad por Cristo firmes!
Las fuerzas son de él;
el brazo de los hombres
es débil y es infiel.
Vestíos la armadura,
velad en oración;
deberes y peligros
demandan gran tesón.`,
},
{
  titulo: 'En la cruz (Me hirió el pecado)', abc: 15, tonalidad: 'Eb', compas: '4/4', bpm: 115, categoria: 'Semana Santa',
  autor: 'Isaac Watts; coro y música Ralph E. Hudson · Trad. Pedro Grado Valdés (1862-1923)', etiquetas: 'cruz, salvación, testimonio',
  notas: 'Cantar el coro después de cada estrofa.',
  acordes: [['Eb','Ab','Eb'], ['Bb'], ['Eb','Ab','Eb'], ['Bb','Eb']],
  coroAcordes: [['Eb'], ['Bb'], ['Ab','Eb'], ['Ab','Eb','Bb'], ['Bb','Eb']],
  letra: `Me hirió el pecado, fui a Jesús,
mostrele mi dolor;
perdido, errante, vi su luz,
bendíjome en su amor.

Coro:
En la cruz, en la cruz,
do primero vi la luz,
y las manchas de mi alma yo lavé;
fue allí por la fe do vi a Jesús,
y feliz para siempre seré.

En una cruz mi buen Señor
su sangre derramó
por este pobre pecador
a quien así salvó.

Venció la muerte, ¡qué placer!,
y el Padre lo exaltó;
espero solo en su poder,
morir no temo yo.

Aunque él se fue, conmigo está
el gran Consolador;
por él entrada tengo ya
al reino del Señor.

Vivir en Cristo trae la paz,
con él habitaré;
ya suyo soy y de hoy en más
a nadie temeré.`,
},
{
  titulo: 'Hay un mundo feliz más allá', abc: 16, tonalidad: 'G', compas: '4/4', bpm: 100, categoria: 'Adoración',
  autor: 'Henry G. Jackson (1838-1914) / Joseph P. Webster', etiquetas: 'cielo, esperanza, eternidad',
  notas: 'Cantar el coro después de cada estrofa.',
  acordes: [['G','C','G'], ['G','D'], ['G','C','G'], ['G','D','G']],
  coroAcordes: [['G'], ['D','G'], ['C','G'], ['D','G']],
  letra: `Hay un mundo feliz más allá,
donde cantan los santos en luz,
tributando su eterno loor
al invicto, glorioso Jesús.

Coro:
En el mundo feliz
reinaremos con nuestro Señor;
en el mundo feliz
reinaremos con nuestro Señor.

Cantaremos con gozo a Jesús,
al Cordero que nos rescató,
y con sangre vertida en la cruz
los pecados del mundo quitó.

Para siempre en el mundo feliz
con los santos daremos honor
al invicto, glorioso Jesús,
a Jesús, nuestro Rey y Señor.`,
},
{
  titulo: 'Dios os guarde', abc: 25, tonalidad: 'C', compas: '4/4', bpm: 105, categoria: 'Adoración',
  autor: 'Jeremiah E. Rankin / William G. Tomer · Trad. anónima', etiquetas: 'despedida, bendición, cierre',
  notas: 'Himno de despedida. Cantar el estribillo después de cada estrofa.',
  acordes: [['C','G','C'], ['F','C'], ['C'], ['C','G','C']],
  coroAcordes: [['C','F','C'], ['G'], ['C','F','C'], ['C','G','C']],
  letra: `Dios os guarde siempre en santo amor;
en la senda peligrosa
de esta vida tormentosa
os conserve en paz y sin temor.

Estribillo:
Al venir Jesús nos veremos
a los pies de nuestro Salvador;
reunidos todos seremos
un redil con nuestro Buen Pastor.

Dios os guarde siempre en santo amor;
os conduzca su bandera,
y os esfuerce en gran manera
con su Espíritu consolador.

Dios os guarde siempre en santo amor
hasta el día en que lleguemos
a la patria do estaremos
para siempre con el Salvador.

Dios os guarde siempre en santo amor;
con su gracia os sostenga,
hasta que en justicia venga
Jesucristo, nuestro redentor.`,
},
{
  titulo: 'Jesús, yo he prometido', abc: 17, tonalidad: 'G', compas: '4/4', bpm: 110, categoria: 'Adoración',
  autor: 'John E. Bode / Arthur H. Mann · Trad. Juan B. Cabrera (1837-1916)', etiquetas: 'consagración, servicio, compromiso',
  acordes: [['G','D'], ['C','G'], ['G','C','G'], ['D','D7'], ['G','D'], ['C','G'], ['C','G','Em'], ['C','D','G']],
  letra: `Jesús, yo he prometido
servirte con amor;
concédeme tu gracia,
mi amigo y Salvador.
No temeré la lucha
si tú a mi lado estás,
ni perderé el camino
si tú guiando vas.

El mundo está muy cerca,
y abunda tentación;
suave es el engaño
y es necia la pasión;
ven tú, Jesús, más cerca
mostrando tu piedad,
y escuda al alma mía
de toda iniquidad.

Cuando mi mente vague
ya incierta, ya veloz,
concédeme que escuche,
Jesús, tu clara voz;
anímame si paro;
inspírame también;
repréndeme, si temo
en todo hacer el bien.

Jesús, tú has prometido
a todo aquel que va
siguiendo tus pisadas,
que al cielo llegará.
Sostenme en el camino,
y al fin con dulce amor
trasládame a tu gloria,
mi amigo y Salvador.`,
},
{
  titulo: 'Objeto de mi fe', abc: 18, tonalidad: 'Eb', compas: '4/4', bpm: 108, categoria: 'Adoración',
  autor: 'Ray Palmer / Lowell Mason · Trad. Thomas M. Westrup (1837-1909)', etiquetas: 'fe, consagración, confianza',
  notas: 'En la 3.ª estrofa el himnario de 1895 dice "oscuro"; se usa "oscura" (concuerda con "senda").',
  acordes: [['Eb','Ab'], ['Bb','Eb'], ['F','Bb'], ['Eb','Bb'], ['Eb','Bb'], ['Ab','Eb'], ['Bb','Eb']],
  letra: `Objeto de mi fe,
divino Salvador,
propicio sé;
Cordero de mi Dios,
libre por tu bondad,
libre de mi maldad
me quiero ver.

Consagra el corazón
que ha de pertenecer
a ti no más;
calmar, fortalecer,
gracia comunicar,
mi celo acrecentar
te dignarás.

La senda al recorrer
oscura y de dolor
me has de guiar;
así tendré valor,
así podré vivir,
así podré morir
en dulce paz.

Pues el camino sé,
de célica mansión
luz y solaz;
bendito Salvador,
tú eres esa verdad,
vida, confianza, amor,
mi eterna paz.`,
},
{
  titulo: 'Cariñoso Salvador', abc: 19, tonalidad: 'F', compas: '3/4', bpm: 95, categoria: 'Adoración',
  autor: 'Charles Wesley / Simeon B. Marsh · Trad. Thomas M. Westrup (1837-1909)', etiquetas: 'refugio, confianza, consuelo',
  notas: 'Tonada MARTYN (el himnario de 1895 usa REFUGE, del mismo metro 7.7.7.7 D).',
  acordes: [['F','C'], ['F','C','F'], ['F','C'], ['F','C','F'], ['F','Bb','F'], ['F','Bb','F'], ['F','C'], ['F','C','F']],
  letra: `Cariñoso Salvador,
huyo de la tempestad
a tu seno protector,
fiándome de tu bondad.
Sálvame, Señor Jesús,
de las olas del turbión;
hasta el puerto de salud
guía mi pobre embarcación.

Otro asilo ninguno hay:
indefenso acudo a ti;
mi necesidad me trae,
porque mi peligro vi.
Solamente en ti, Señor,
creo tener consuelo y luz;
vengo lleno de temor
a los pies de mi Jesús.

Cristo, encuentro todo en ti,
y no necesito más;
caído me pusiste en pie;
débil, ánimo me das;
al enfermo das salud,
guías tierno al que no ve;
con amor y gratitud
tu bondad ensalzaré.`,
},
{
  titulo: 'Cerca de ti, Señor', abc: 20, tonalidad: 'F', compas: '4/4', bpm: 110, categoria: 'Adoración',
  autor: 'Thomas M. Westrup (1837-1909) / Lowell Mason', etiquetas: 'comunión, intimidad, cielo',
  acordes: [['F','Bb'], ['F','C'], ['F','Bb'], ['F','C','F'], ['F','Bb','F'], ['F','C'], ['F','Bb'], ['F','C','F']],
  letra: `Cerca de ti, Señor,
quiero morar;
lo tierno de tu amor
quiero gozar.
Llena mi pobre ser,
limpia mi corazón,
hazme tu rostro ver
en tu mansión.

Pasos inciertos doy,
el sol se va;
mas si contigo estoy
no temo ya.
Himnos de gratitud
ferviente cantaré,
y fiel a ti, Jesús,
siempre seré.

Día feliz veré
creyendo en ti,
en que habitaré
cerca de ti.
Mi voz alabará
tu dulce nombre allí,
y mi alma gozará
cerca de ti.`,
},
{
  titulo: 'Salvo en los tiernos brazos', abc: 21, tonalidad: 'G', compas: '4/4', bpm: 110, categoria: 'Adoración',
  autor: 'Fanny J. Crosby / W. Howard Doane · Trad. Juan B. Cabrera (1837-1916)', etiquetas: 'seguridad, descanso, consuelo',
  notas: 'Cantar el coro después de cada estrofa.',
  acordes: [['G','C','G'], ['G','D'], ['G','C','G'], ['D','G'], ['D'], ['A','D'], ['D','A'], ['D','D7']],
  coroAcordes: [['G','C','G'], ['G','D'], ['G','C','G'], ['D','G']],
  letra: `Salvo en los tiernos brazos
de mi Jesús seré,
y en su amoroso pecho
siempre reposaré.
Este es sin duda el eco
de celestial canción,
que de inefable gozo
llena mi corazón.

Coro:
Salvo en los tiernos brazos
de mi Jesús seré,
y en su amoroso pecho
siempre reposaré.

Tiende Jesús los brazos,
bríndame su amistad;
a su poder me acojo;
no hay para mí ansiedad.
No temeré si ruge
hórrida tentación;
ni causará el pecado
daño en mi corazón.

De sus amantes brazos
tierna solicitud
líbrame de tristeza,
líbrame de inquietud.
Y si tal vez hay pruebas,
fáciles pasarán;
lágrimas si vertiere,
pronto se enjugarán.

Y cruzaré la noche
lóbrega, sin temor,
hasta que venga el día
de perennal fulgor;
¡cuán placentero entonces
con él será morar,
y en la mansión de gloria
con mi Jesús reinar!`,
},
{
  titulo: 'No me pases', abc: 22, tonalidad: 'Ab', compas: '4/4', bpm: 107, categoria: 'Adoración',
  autor: 'Fanny J. Crosby / W. Howard Doane · Trad. anónima (1895)', etiquetas: 'oración, clamor, misericordia',
  notas: 'Cantar el coro después de cada estrofa.',
  acordes: [['Ab','Db','Ab'], ['Eb'], ['Ab','Db','Ab'], ['Eb','Ab']],
  coroAcordes: [['Ab'], ['Db','Ab'], ['Ab','Db','Ab'], ['Eb','Ab']],
  letra: `No me pases, no me olvides,
tierno Salvador;
muchos gozan tus mercedes,
oye mi clamor.

Coro:
Cristo, Cristo,
oye tú mi voz;
Salvador, tu gracia dame,
oye mi clamor.

Ante el trono de tu gracia
hallo dulce paz;
nada aquí mi alma sacia;
tú eres mi solaz.

Solo fío en tus bondades,
guíame en tu luz,
y mi alma no deseches,
sálvame, Jesús.

Fuente viva de consuelo
tú eres para mí;
¿a quién tengo en este suelo
sino solo a ti?`,
},
{
  titulo: 'Dime la antigua historia', abc: 23, tonalidad: 'C', compas: '4/4', bpm: 112, categoria: 'Misiones',
  autor: 'A. Katherine Hankey / W. Howard Doane · Trad. Juan B. Cabrera (1837-1916)', etiquetas: 'evangelio, testimonio',
  notas: 'Cantar el coro después de cada estrofa.',
  acordes: [['C','F','C'], ['C','G'], ['C','F','C'], ['G','C'], ['G','C'], ['D','G'], ['C','F','C'], ['G','C']],
  coroAcordes: [['C','F'], ['G','C'], ['C','F'], ['C','G','C']],
  letra: `Dime la antigua historia
del celestial favor,
de Cristo y de su gloria,
de Cristo y de su amor.
Dímela con llaneza
propia de la niñez,
porque es mi mente flaca
y anhela sencillez.

Coro:
Dime la antigua historia,
cuéntame la victoria,
háblame de la gloria
de Cristo y de su amor.

Dime esa grata historia
con lentitud, y así
conoceré la obra
que Cristo hizo por mí.
Dímela con frecuencia;
soy dado a olvidar,
y el matinal rocío
suele el sol disipar.

Dime tan dulce historia
con tono claro y fiel:
murió Jesús, y salvo
yo quiero ser por él.
Dime esa historia siempre,
si en tiempo de aflicción
deseas a mi alma
traer consolación.`,
},
{
  titulo: '¡Oh dulce, grata oración!', abc: 24, tonalidad: 'D', compas: '6/8', bpm: 78, categoria: 'Adoración',
  autor: 'William W. Walford / William B. Bradbury · Trad. anónima (1895)', etiquetas: 'oración, comunión',
  acordes: [['D','G','D'], ['A'], ['D','G','D'], ['A','D'], ['D','G','D'], ['D','A'], ['D','G','D'], ['A','D']],
  letra: `¡Oh dulce, grata oración!
Tú del contacto mundanal
me elevarás a la mansión
del tierno Padre celestial.
Huyendo yo la tentación
y toda influencia terrenal,
por Cristo que murió por mí
será mi ruego oído allí.

¡Oh dulce, grata oración!
A quien escucha con bondad
elevas tú mi corazón,
a Dios que ama con verdad.
Espero yo su bendición,
perfecta paz y santidad,
por Cristo que murió por mí,
por el que me ha salvado aquí.

¡Oh Padre mío, Dios de amor!,
escucha tú mi oración.
¡Oh Cristo, mi fiel Salvador!,
escucha tú mi oración.
¡Espíritu Consolador!,
escucha tú mi oración.
Bendíceme, oh Trinidad,
que estás en la eternidad.`,
},
];
