-- ============================================================
-- Alabanza: biblioteca inicial de himnos - MQV
-- Requiere haber ejecutado antes: backend/migrations/alabanza.sql
-- Generado automáticamente: 25 himnos completos, cada uno con
--   · letra en español (traducciones de dominio público tomadas de himnarios
--     de 1893-1914 escaneados en archive.org y de hymnary.org),
--   · acordes en ChordPro (armonización básica, en la tonalidad de la partitura),
--   · partitura de la melodía en notación ABC (Open Hymnal Project y freehymns,
--     a partir de himnarios antiguos; se dibuja y reproduce en la web y la app).
--
-- Se puede re-ejecutar:
--   · inserta los himnos cuyo título aún no existe,
--   · actualiza los que ya cargó este script (usuario = 'biblioteca-inicial'),
--   · quita lo que dejó la versión anterior de este script y ya no está en la
--     biblioteca (si no se usa en el programa de alguna actividad).
-- No toca canciones creadas por los usuarios.
-- ============================================================

SET NAMES utf8mb4;

DROP TEMPORARY TABLE IF EXISTS tmp_canciones;
CREATE TEMPORARY TABLE tmp_canciones (
  titulo          VARCHAR(255) NOT NULL,
  autor           VARCHAR(255) NULL,
  tipo            VARCHAR(30)  NOT NULL,
  tonalidad       VARCHAR(5)   NULL,
  bpm             SMALLINT     NULL,
  compas          VARCHAR(5)   NULL,
  categoria       VARCHAR(60)  NULL,
  etiquetas       VARCHAR(255) NULL,
  letra_acordes   MEDIUMTEXT   NULL,
  partitura_abc   MEDIUMTEXT   NULL,
  notas           TEXT         NULL,
  dominio_publico TINYINT(1)   NOT NULL
) DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_canciones
  (titulo, autor, tipo, tonalidad, bpm, compas, categoria, etiquetas, letra_acordes, partitura_abc, notas, dominio_publico)
VALUES
('Santo, Santo, Santo',
 'Reginald Heber / John B. Dykes · Trad. Juan B. Cabrera (1837-1916)',
 'himno',
 'D',
 110,
 '4/4',
 'Adoración',
 'Trinidad, santidad, apertura',
 '{start_of_verse: Estrofa 1}
[D]¡Santo! [Bm]¡Santo! ¡Santo! [G]Señor [D]omnipotente,
[D]siempre el [A]labio mío [E7]loores te [A]dará.
[D]¡Santo! ¡Santo! [Bm]¡Santo! [G]Te adoro [D]reverente,
[G]Dios [D]en tres [Em]personas, [A7]bendita [D]Trinidad.
{end_of_verse}

{start_of_verse: Estrofa 2}
[D]¡Santo! ¡Santo! [Bm]¡Santo! [G]En numeroso [D]coro,
[D]santos escogidos [A]te [E7]adoran sin [A]cesar,
[D]de alegría [Bm]llenos; y sus [G]coronas de [D]oro
[G]rinden ante [D]el trono [Em]y [A7]el cristalino [D]mar.
{end_of_verse}

{start_of_verse: Estrofa 3}
[D]¡Santo! ¡Santo! [Bm]¡Santo! [G]La inmensa [D]muchedumbre
[D]de ángeles [A]que cumplen [E7]tu santa [A]voluntad,
[D]ante ti [Bm]se postra, bañada [G]de tu [D]lumbre,
[G]ante ti, [D]que has [Em]sido, que [A7]eres y [D]serás.
{end_of_verse}

{start_of_verse: Estrofa 4}
[D]¡Santo! ¡Santo! [Bm]¡Santo! Por más [G]que estés [D]velado,
[D]e imposible [A]sea [E7]tu gloria [A]contemplar,
[D]santo tú eres [Bm]solo, y nada [G]hay a tu [D]lado
[G]en [D]poder perfecto, [Em]pureza [A7]y [D]caridad.
{end_of_verse}

{start_of_verse: Estrofa 5}
[D]¡Santo! ¡Santo! [Bm]¡Santo! La gloria [G]de tu [D]nombre
[D]vemos en tus [A]obras en [E7]cielo, tierra y [A]mar;
[D]¡Santo! ¡Santo! [Bm]¡Santo! Te [G]adorará todo [D]hombre,
[G]Dios [D]en tres [Em]personas, [A7]bendita [D]Trinidad.
{end_of_verse}',
 'X:1
T:Santo, Santo, Santo
T:(NICAEA)
M:4/4
L:1/4
Q:1/4=110
K:D
D D F F | A2 A2 | B- B B B | A2 F2 | A3/2 A/ A A |
d- d c A | E A B3/2 A/ | A4 | D D F F | A- A A2 |
B3/2 B/ B B | A2 A2 | d2 A A | B2 F2 | G E E3/2 D/ | D4 |]',
 NULL,
 1),

('Castillo fuerte es nuestro Dios',
 'Martín Lutero · Trad. Juan B. Cabrera (1837-1916)',
 'himno',
 'D',
 110,
 '4/4',
 'Adoración',
 'Reforma, confianza, protección',
 '{start_of_verse: Estrofa 1}
[D]Castillo fuerte [A]es nuestro [D]Dios,
[G]defensa y [D]buen [A]escudo;
[D]con su [A]poder nos [D]librará
[G]en este [D]trance [A]agudo.
[D]Con furia y con [A]afán
[Bm]acósanos [F#m]Sat[G]án;
[D]por armas deja [A]ver
[Bm]astucia y [E]gran [A]poder;
[D]cual él [G]no hay [A]en la [D]tierra.
{end_of_verse}

{start_of_verse: Estrofa 2}
[D]Nuestro valor [A]es nada [D]aquí,
[G]con él [D]todo es [A]perdido;
[D]mas por [A]nosotros [D]pugnará
[G]de Dios [D]el [A]Escogido.
[D]¿Sabéis quién es? [A]Jesús,
[Bm]el que venció [F#m]en la [G]cruz,
[D]Señor de [A]Sabaoth;
[Bm]y pues él [E]solo es [A]Dios,
[D]él [G]triunfa en [A]la [D]batalla.
{end_of_verse}

{start_of_verse: Estrofa 3}
[D]Aun si [A]están demonios [D]mil
[G]prontos [D]a [A]devorarnos,
[D]no temeremos, [A]porque [D]Dios
[G]sabrá [D]aún [A]prosperarnos.
[D]Que muestre su [A]vigor
[Bm]Satán, y [F#m]su [G]furor;
[D]dañarnos no [A]podrá,
[Bm]pues condenado [E]es [A]ya
[D]por [G]la [A]Palabra [D]santa.
{end_of_verse}',
 'X:1
T:Castillo fuerte es nuestro Dios
T:(EIN FESTE BURG (isorritmica))
M:4/4
L:1/4
Q:1/4=110
K:D
d | d d A/B/ c | d/c/ B !fermata!A d | c B A B | (G/F/ E) !fermata!D
d | d d A/B/ c | d/c/ B !fermata!A d | c B A B | (G/F/ E) !fermata!D
D | F A B ^G | !fermata!A D A A | B c !fermata!d c | d c B B | !fermata!A
B B A | B G !fermata!F d | c B A B | (G/F/ E) !fermata!D |]',
 'Melodía en su forma isorrítmica.',
 1),

('¡Oh qué amigo nos es Cristo!',
 'Joseph M. Scriven / Charles C. Converse · Trad. Leandro Garza Mora (1854-1938)',
 'himno',
 'F',
 98,
 '4/4',
 'Adoración',
 'oración, consuelo, amistad',
 '{start_of_verse: Estrofa 1}
[F]¡Oh qué amigo [Bb]nos es [F]Cristo!
[F]Él llevó nuestro [C]dolor,
[F]y nos [Bb]manda que [F]llevemos
[F]todo a [C]Dios en [F]oración.
[C]¿Vive el hombre [G7]desprovisto
[C]de paz, gozo y santo [C7]amor?
[F]Esto es [Bb]porque no [F]llevamos
[F]todo a [C]Dios en [F]oración.
{end_of_verse}

{start_of_verse: Estrofa 2}
[F]¿Vives débil [Bb]y [F]cargado
[F]de cuidados y [C]temor?
[F]A Jesús, [Bb]refugio [F]eterno,
[F]dile todo [C]en [F]oración.
[C]¿Te desprecian tus [G7]amigos?
[C]Cuéntaselo en [C7]oración;
[F]en sus brazos [Bb]de amor [F]tierno
[F]paz tendrá [C]tu [F]corazón.
{end_of_verse}

{start_of_verse: Estrofa 3}
[F]Jesucristo es [Bb]nuestro [F]amigo:
[F]de esto pruebas él nos [C]dio
[F]al sufrir [Bb]el cruel [F]castigo
[F]que el [C]culpable [F]mereció.
[C]Y su pueblo [G7]redimido
[C]hallará [C7]seguridad
[F]fiando en [Bb]este Amigo [F]eterno
[F]y esperando [C]en su [F]bondad.
{end_of_verse}',
 'X:1
T:¡Oh qué amigo nos es Cristo!
T:(ERIE (CONVERSE))
M:4/4
L:1/4
Q:1/4=98
K:F
c3/2 c/ d/ c/ A/ F/ | F2 D2 | C3/2 F/ A/ F/ c/ A/ | G4 |
c3/2 c/ d/ c/ A/ F/ | F2 D2 | C3/2 F/ A/ G/ F/ E/ | F4 |
G3/2 ^F/ G/ A/ B/ G/ | A2 c2 | d3/2 d/ c/ A/ B/ A/ | G4 |
c3/2 c/ d/ c/ A/ F/ | F2 D2 | C3/2 F/ A/ G/ F/ E/ | F4 |]',
 NULL,
 1),

('Roca de la eternidad',
 'Augustus M. Toplady / Thomas Hastings · Trad. Thomas M. Westrup (1837-1909)',
 'himno',
 'Bb',
 145,
 '3/2',
 'Semana Santa',
 'cruz, perdón, salvación',
 '{start_of_verse: Estrofa 1}
[Bb]Roca de [F]la [Bb]eternidad,
[Bb]fuiste [Eb]abierta [F]para [Bb]mí;
[F]sé mi escondedero [Bb]fiel;
[F]solo encuentro paz en [Bb]ti,
[Bb]rico, [F]limpio [Bb]manantial,
[Bb]en [Eb]el cual [F]lavado [Bb]fui.
{end_of_verse}

{start_of_verse: Estrofa 2}
[Bb]Aunque fuese [F]siempre [Bb]fiel,
[Bb]aunque [Eb]llore [F]sin [Bb]cesar,
[F]del pecado no [Bb]podré
[F]justificación [Bb]lograr;
[Bb]solo en [F]ti teniendo [Bb]fe
[Bb]deuda [Eb]tal [F]podré [Bb]pagar.
{end_of_verse}

{start_of_verse: Estrofa 3}
[Bb]Mientras tenga [F]que [Bb]vivir,
[Bb]mi [Eb]último suspiro [F]al [Bb]dar,
[F]cuando vaya a [Bb]responder
[F]en tu augusto [Bb]tribunal,
[Bb]sé mi [F]escondedero [Bb]fiel,
[Bb]Roca [Eb]de [F]la [Bb]eternidad.
{end_of_verse}',
 'X:1
T:Roca de la eternidad
T:(TOPLADY)
M:3/2
L:1/4
Q:1/4=145
K:Bb
F3/2 G/ | F2 D2 B3/2 G/ | F4 B c | d3 c B A | B4
A3/2 B/ | c3 c A F | B4 A3/2 B/ | c3 c A F | B4
F3/2 G/ | F2 D2 B3/2 G/ | F4 B c | d3 c B A | B4 |]',
 NULL,
 1),

('Firmes y adelante',
 'Sabine Baring-Gould / Arthur S. Sullivan · Trad. Juan B. Cabrera (1837-1916)',
 'himno',
 'Eb',
 112,
 '4/4',
 'Júbilo',
 'iglesia, perseverancia, victoria',
 '{start_of_verse: Estrofa 1}
[Eb]Firmes y adelante,
[Bb]huestes de la [Eb]fe,
[Eb]sin temor [Ab]alguno,
[Bb]que Jesús nos ve.
[Bb]Jefe soberano,
[Cm]Cristo al frente [F]va,
[Bb]y la regia [Eb]enseña
[Ab]tremolando [F]est[Bb]á.
{end_of_verse}

{start_of_chorus: Coro}
[Eb]Firmes y [Ab]adelante,
[Eb]huestes de la [Bb]fe,
[Eb]sin temor [Ab]alguno,
[Eb]que Jesús [Bb]nos [Eb]ve.
{end_of_chorus}

{start_of_verse: Estrofa 2}
[Eb]Al sagrado nombre
[Bb]de nuestro [Eb]Adalid,
[Eb]tiembla el [Ab]enemigo
[Bb]y huye de la lid.
[Bb]Nuestra es la victoria,
[Cm]dad a Dios [F]loor;
[Bb]y óigalo el [Eb]averno
[Ab]lleno [F]de [Bb]pavor.
{end_of_verse}

{start_of_verse: Estrofa 3}
[Eb]Muévese potente
[Bb]la Iglesia de [Eb]Dios;
[Eb]de los ya [Ab]gloriosos
[Bb]marchamos en pos;
[Bb]somos solo un cuerpo,
[Cm]y uno es el [F]Señor,
[Bb]una la [Eb]esperanza,
[Ab]y uno [F]nuestro [Bb]amor.
{end_of_verse}

{start_of_verse: Estrofa 4}
[Eb]Tronos y coronas
[Bb]pueden [Eb]perecer;
[Eb]de Jesús la [Ab]Iglesia
[Bb]constante ha de ser;
[Bb]nada en contra suya
[Cm]preval[F]ecerá,
[Bb]porque la [Eb]promesa
[Ab]nunca [F]falt[Bb]ará.
{end_of_verse}',
 'X:1
T:Firmes y adelante
T:(ST. GERTRUDE)
M:4/4
L:1/4
Q:1/4=112
K:Eb
B B B B | (B3/2 c/) B2 | F F E F | G4 |
E G B e | e2 d2 | c c G =A | B4 |
F F B F | (G3/2 A/) G2 | B B e B | c4 |
c B A B | (c B) (A B) | c B A G | F4 |
E E E E | (E D/C/) (D E) | F F F (E/F/) | G4 |
B B e d | e2 B2 | A G F3/2 E/ | E4 |]',
 'Cantar el coro después de cada estrofa.',
 1),

('Tal como soy',
 'Charlotte Elliott / William B. Bradbury · Trad. Thomas M. Westrup (1837-1909)',
 'himno',
 'D',
 120,
 '3/4',
 'Adoración',
 'invitación, entrega, llamado',
 '{start_of_verse: Estrofa 1}
[D]Tal como [G]soy, de [D]pecador,
[D]sin más confianza que tu [A]amor,
[D]ya que [G]me llamas, [Bm]acudí;
[D]Cordero de [A7]Dios, heme [D]aquí.
{end_of_verse}

{start_of_verse: Estrofa 2}
[D]Tal como [G]soy, buscando [D]paz
[D]en mi desgracia y mal [A]tenaz,
[D]conflicto grande [G]siento en [Bm]mí;
[D]Cordero de [A7]Dios, heme [D]aquí.
{end_of_verse}

{start_of_verse: Estrofa 3}
[D]Tal como [G]soy, me [D]acogerás;
[D]perdón y alivio me [A]darás;
[D]pues tu [G]promesa ya [Bm]creí,
[D]Cordero de [A7]Dios, heme [D]aquí.
{end_of_verse}

{start_of_verse: Estrofa 4}
[D]Tal como [G]soy, tu [D]compasión
[D]vencido ha toda [A]oposición;
[D]ya pertenezco [G]solo a [Bm]ti:
[D]Cordero de [A7]Dios, heme [D]aquí.
{end_of_verse}',
 'X:1
T:Tal como soy
T:(WOODWORTH)
M:3/4
L:1/4
Q:1/4=120
K:D
(D/E/) | F2 F | (A3/2 G/) F | (E3/2 F/) G | F2
A | (A E) F | G2 B | B2 A | F2
(D/E/) | F2 F | (A3/2 G/) F | B2 B | (d3/2 c/)
B | A2 A | (A3/2 G/) F | E3 | A3 | F3- | F2 |]',
 'Himno de invitación.',
 1),

('Doxología',
 'Thomas Ken / Louis Bourgeois (Old 100th) · Trad. anónima',
 'himno',
 'G',
 112,
 '4/4',
 'Ofrenda',
 'alabanza, Trinidad, cierre',
 '{start_of_verse: Estrofa 1}
[G]A [Em]Dios el [D]Padre [G]celestial,
[G]al [D]Hijo, [C]nuestro [G]Reden[D]tor,
[G]y [D]al [Em]eternal [D]Consol[G]ador,
[G]unidos [C]todos [D]alab[G]ad.
{end_of_verse}

{start_of_verse: Estrofa 2}
[G]Cantad al [Em]Trino [D]y Uno [G]Dios,
[G]sus [D]alabanzas [C]ent[G]on[D]ad;
[G]su [D]eterna [Em]honra [D]procl[G]amad
[G]con voz [C]de amor [D]y gratitud. [G]Amén.
{end_of_verse}',
 'X:1
T:Doxología
T:(OLD 100TH)
M:4/4
L:1/4
Q:1/4=112
K:G
G2 | G F E D | G2 A2 | B2 B2 | B B A G | c2 B2 | A2 G2 | A B A G | E2 F2 | G2 d2 | B G A c | B2 A2 | G2 |]',
 'Se usa al presentar la ofrenda o al cerrar el culto.',
 1),

('Cantad alegres al Señor',
 'Tomás J. González Carvajal (1753-1834), Salmo 100 · Música: Louis Bourgeois (Old 100th)',
 'himno',
 'G',
 112,
 '4/4',
 'Júbilo',
 'Salmo 100, alabanza, gratitud',
 '{start_of_verse: Estrofa 1}
[G]Cantad [Em]alegres [D]al [G]Señor,
[G]mortales [D]todos [C]por [G]doqu[D]ier;
[G]servidle [D]siempre [Em]con [D]ferv[G]or,
[G]obedecedle [C]con [D]plac[G]er.
{end_of_verse}

{start_of_verse: Estrofa 2}
[G]Con [Em]gratitud [D]canción [G]alzad
[G]al Hacedor [D]que [C]el ser [G]os [D]dio;
[G]al [D]Dios [Em]excelso [D]vene[G]rad,
[G]que [C]como Padre [D]nos [G]amó.
{end_of_verse}

{start_of_verse: Estrofa 3}
[G]Su [Em]pueblo [D]somos: [G]salvará
[G]a [D]sus [C]ovejas [G]el [D]Pastor;
[G]ninguna [D]de [Em]ellas [D]falt[G]ará
[G]si [C]fueren fieles [D]al [G]Señor.
{end_of_verse}',
 'X:1
T:Cantad alegres al Señor
T:(OLD 100TH)
M:4/4
L:1/4
Q:1/4=112
K:G
G2 | G F E D | G2 A2 | B2 B2 | B B A G | c2 B2 | A2 G2 | A B A G | E2 F2 | G2 d2 | B G A c | B2 A2 | G2 |]',
 'Metro largo (8.8.8.8): también se canta con la tonada DUKE STREET.',
 1),

('Cristo me ama',
 'Anna B. Warner / William B. Bradbury · Trad. anónima',
 'himno',
 'C',
 120,
 '4/4',
 'Infantil',
 'niños, amor de Dios, Biblia',
 '{start_of_verse: Estrofa 1}
[C]Cristo me ama, [F]bien lo [C]sé;
[C]su palabra [G]me hace [C]ver
[C]que los niños [F]son de [C]aquel
[C]quien es [G]nuestro amigo [C]fiel.
{end_of_verse}

{start_of_chorus: Estribillo}
[C]Cristo me ama, [F]Cristo me [C]ama,
[C]Cristo me ama; [G]la Biblia dice [C]así.
{end_of_chorus}

{start_of_verse: Estrofa 2}
[C]Cristo me [F]ama, me [C]salvó,
[C]y en la [G]cruz por mí [C]murió;
[C]mi [F]pecado [C]perdonó;
[C]vida eterna [G]me [C]donó.
{end_of_verse}

{start_of_verse: Estrofa 3}
[C]Cristo me [F]ama, es [C]verdad,
[C]y me cuida [G]en su [C]bondad;
[C]me conduce [F]el Buen [C]Pastor,
[C]es mi [G]guía y [C]protector.
{end_of_verse}',
 'X:1
T:Cristo me ama
T:(JESUS LOVES ME)
M:4/4
L:1/4
Q:1/4=120
K:C
G E E D | E G G2 | A A c A | A G G2 |
G E E D | E G G2 | A A G C | E D C2 ||
G2 E G | A c3 | G2 E C | E D3 |
G2 E G | A c2 A | G C E D | C4 |]',
 'Cantar el estribillo después de cada estrofa.',
 1),

('Noche de paz',
 'Joseph Mohr / Franz X. Gruber · Trad. Federico Fliedner (1845-1901)',
 'himno',
 'Bb',
 60,
 '6/8',
 'Navidad',
 'nacimiento, paz',
 '{start_of_verse: Estrofa 1}
[Bb]Noche de paz, noche de amor.
[F]Todo duerme en [Bb]derredor.
[Eb]Entre los astros que esparcen su [Bb]luz,
[Eb]bella anunciando al niñito [Bb]Jesús,
[F]brilla la estrella de [Bb]paz,
[Bb]brilla la [F]estrella de [Bb]paz.
{end_of_verse}

{start_of_verse: Estrofa 2}
[Bb]Noche de paz, noche de amor.
[F]Oye humilde, fiel [Bb]pastor:
[Eb]coros celestes proclaman [Bb]salud,
[Eb]gracias y glorias en gran [Bb]plenitud,
[F]por nuestro buen [Bb]Redentor,
[Bb]por nuestro [F]buen [Bb]Redentor.
{end_of_verse}

{start_of_verse: Estrofa 3}
[Bb]Noche de paz, noche de amor.
[F]Ved qué bello [Bb]resplandor
[Eb]luce en el rostro del niño [Bb]Jesús,
[Eb]en el pesebre, del mundo la [Bb]Luz;
[F]astro de eterno [Bb]fulgor,
[Bb]astro de [F]eterno [Bb]fulgor.
{end_of_verse}',
 'X:1
T:Noche de paz
T:(STILLE NACHT)
M:6/8
L:1/8
Q:1/4=60
K:Bb
(F3/2G/) F D3 | (F3/2G/) F D3 | c2 c A3 | B2 B F3 |
G2 G (B3/2A/) G | F3/2 G/ F D3 | G2 G B3/2 A/ G | F3/2 G/ F D3 |
c2 c e3/2 c/ A | (B3 d3) | (B3/2F/) D F3/2 E/ C | B,6 |]',
 NULL,
 1),

('¡Al mundo paz!',
 'Isaac Watts / G. F. Händel, arr. Lowell Mason · Trad. anónima',
 'himno',
 'D',
 80,
 '2/4',
 'Navidad',
 'nacimiento, gozo, Rey',
 '{start_of_verse: Estrofa 1}
[D]¡Al [G]mundo paz, [A]nació [D]Jesús!
[G]Nació ya [A]nuestro [D]Rey;
[D]el corazón ya tiene luz,
[D]y paz su santa [A]grey,
[D]y paz su santa [A]grey,
[D]y paz, [G]y paz [A]su santa [D]grey.
{end_of_verse}

{start_of_verse: Estrofa 2}
[D]¡Al [G]mundo paz, [A]el [D]Salvador
[G]en [A]tierra [D]reinará!
[D]Ya es feliz el pecador,
[D]Jesús perdón le [A]da,
[D]Jesús perdón le [A]da,
[D]Jesús, [G]Jesús perdón [A]le [D]da.
{end_of_verse}

{start_of_verse: Estrofa 3}
[D]Al [G]mundo [A]él [D]gobernará
[G]con gracia [A]y con [D]poder;
[D]a las naciones mostrará
[D]su amor y su [A]poder,
[D]su amor y su [A]poder,
[D]su amor, [G]su amor [A]y su [D]poder.
{end_of_verse}',
 'X:1
T:¡Al mundo paz!
T:(ANTIOCH)
M:2/4
L:1/4
Q:1/4=80
K:D
d c3/4B// | A3/2 G/ | F E | D3/2 A/ | B3/2 B/ | c3/2 c/ | d3/2 d/ |
d/c/ B/A/ | A3/4G//F/ d/ | d/c/ B/A/ | A3/4G//F/ F/ | F/F/ F/F//G// | A3/2 G//F// |
E/E/ E/E//F// | G3/2 F//E// | (D/ d) B/ | A3/4G//F/ G/ | F E | D2 |]',
 NULL,
 1),

('Venid, fieles todos',
 'Atrib. John F. Wade · Trad. Juan B. Cabrera (1837-1916)',
 'himno',
 'G',
 115,
 '4/4',
 'Navidad',
 'nacimiento, adoración',
 '{start_of_verse: Estrofa 1}
[G]Venid, fieles [D]todos, [G]a Belén [D]marchemos
[G]de gozo [D]triunfantes, [A]henchidos de [D]amor,
[G]y al [D]Rey de los [C]cielos humilde [D]veremos:
[G]venid, adoremos [C]a [D]Cristo el [G]Señor.
{end_of_verse}

{start_of_verse: Estrofa 2}
[G]En [D]pobre pesebre [G]yace [D]reclinado,
[G]al [D]hombre ofreciendo [A]eternal [D]salvación,
[G]el santo [D]Mesías, [C]el Verbo [D]humanado:
[G]venid, adoremos [C]a [D]Cristo el [G]Señor.
{end_of_verse}

{start_of_verse: Estrofa 3}
[G]Cantad [D]jubilosas, [G]célicas [D]criaturas:
[G]resuenan los [D]cielos [A]con vuestra [D]canción;
[G]¡al Dios [D]bondadoso gloria [C]en las [D]alturas!
[G]Venid, adoremos [C]a [D]Cristo el [G]Señor.
{end_of_verse}

{start_of_verse: Estrofa 4}
[G]Jesús, [D]celebramos tu [G]bendito [D]nombre
[G]con himnos [D]solemnes [A]de grato [D]loor;
[G]por siglos [D]eternos [C]adórete el [D]hombre:
[G]venid, adoremos [C]a [D]Cristo el [G]Señor.
{end_of_verse}',
 'X:1
T:Venid, fieles todos
T:(ADESTE FIDELES)
M:4/4
L:1/4
Q:1/4=115
K:G
G | G2 D G | A2 D D | B A B c | B2 A
G | G2 F E | F G A B | F2 E3/2 D/ | D3
D | d2 c B | c2 B B | A B G A | (F3/2 E/) D
G | G F G A | G2 D B | B A B c | B2 A
B | c B A G | F2 G c | B2 A3/2 G/ | G3 |]',
 'Con la tonada ADESTE FIDELES se repite "venid, adoremos" tres veces al final de cada estrofa.',
 1),

('Oíd un son en alta esfera',
 'Charles Wesley / Felix Mendelssohn · Trad. Federico Fliedner (1845-1901)',
 'himno',
 'F',
 112,
 '4/4',
 'Navidad',
 'nacimiento, ángeles, gloria',
 '{start_of_verse: Estrofa 1}
[F]Oíd un son [C]en alta [F]esfera:
[F]"¡En los cielos [Dm]gloria a [C]Dios,
[F]y al mortal [Bb]paz en la [C]tierra!"
[F]canta la [C]celeste [F]voz.
[F]Con los cielos [C]alabemos,
[F]al eterno Rey [C]cantemos,
[Bb]a Jesús, que [F]es nuestro [C]bien,
[Bb]con el [F]coro de [C]Belén.
[Bb]Canta la celeste [F]voz:
[F]"¡En los cielos [C]gloria a [F]Dios!"
{end_of_verse}

{start_of_verse: Estrofa 2}
[F]El Señor [C]de los [F]señores,
[F]el [Dm]Ungido [C]celestial,
[F]a salvar [Bb]los [C]pecadores
[F]bajó al [C]seno [F]virginal.
[F]Loor al Verbo [C]encarnado,
[F]en humanidad [C]velado;
[Bb]gloria al [F]Santo de [C]Israel,
[Bb]cuyo nombre [F]es [C]Emmanuel.
[Bb]Canta la celeste [F]voz:
[F]"¡En los cielos [C]gloria a [F]Dios!"
{end_of_verse}

{start_of_verse: Estrofa 3}
[F]Príncipe de [C]paz [F]eterna,
[F]gloria a [Dm]ti, Señor [C]Jesús;
[F]entregando el [Bb]alma [C]tierna,
[F]tú nos traes [C]vida y [F]luz.
[F]Has tu majestad [C]dejado,
[F]y buscarnos te has [C]dignado;
[Bb]para darnos [F]el [C]vivir,
[Bb]a la [F]muerte quieres [C]ir.
[Bb]Canta la celeste [F]voz:
[F]"¡En los cielos [C]gloria a [F]Dios!"
{end_of_verse}',
 'X:1
T:Oíd un son en alta esfera
T:(MENDELSSOHN)
M:4/4
L:1/4
Q:1/4=112
K:F
C F F3/2 E/ | F A (A G) | c c c3/2 B/ | A G A2 |
C F F3/2 E/ | F A (A G) | c G G3/2 E/ | E D C2 |
c c c F | B A (A G) | c c c F | B A (A G) |
d d d c | B A B2 | G (A/B/) c3/2 F/ | F G A2 |
d3/2 d/ d c | B A B2 | G (A/B/) c3/2 F/ | F G F2 |]',
 NULL,
 1),

('¡Estad por Cristo firmes!',
 'George Duffield / George J. Webb · Trad. Jaime C. Clifford (1872-1936)',
 'himno',
 'Bb',
 117,
 '4/4',
 'Júbilo',
 'perseverancia, servicio, victoria',
 '{start_of_verse: Estrofa 1}
[Bb]¡Estad por Cristo [Eb]firmes,
[Bb]soldados de la [F]cruz!
[Bb]Alzad hoy la [Eb]bandera,
[F]en nombre de [Bb]Jesús.
[F]Es vuestra la [Bb]victoria,
[Eb]con él [C]por [F]Capitán;
[Bb]por él serán [Eb]vencidas
[F]las huestes de [Bb]Satán.
{end_of_verse}

{start_of_verse: Estrofa 2}
[Bb]¡Estad por Cristo [Eb]firmes!
[Bb]Os llama él a la [F]lid;
[Bb]¡con él, pues, a la [Eb]lucha,
[F]soldados todos [Bb]id!
[F]Probad que sois [Bb]valientes,
[Eb]luchando contra [C]el [F]mal;
[Bb]es fuerte el [Eb]enemigo,
[F]mas Cristo es sin [Bb]igual.
{end_of_verse}

{start_of_verse: Estrofa 3}
[Bb]¡Estad por Cristo [Eb]firmes!
[Bb]Las fuerzas son de [F]él;
[Bb]el brazo de los [Eb]hombres
[F]es débil y es [Bb]infiel.
[F]Vestíos la [Bb]armadura,
[Eb]velad [C]en [F]oración;
[Bb]deberes y [Eb]peligros
[F]demandan gran [Bb]tesón.
{end_of_verse}',
 'X:1
T:¡Estad por Cristo firmes!
T:(WEBB)
M:4/4
L:1/4
Q:1/4=117
K:Bb
F | B3/2 B/ d B | B2 G
B | F B c d | c3
F | B3/2 B/ d B | B2 G
B | F B d c | B3
F | c3/2 c/ B c | d2 d
d | e d G c | (B2 A)
F | B3/2 B/ d B | B2 G
B | F B d c | B3 |]',
 NULL,
 1),

('En la cruz (Me hirió el pecado)',
 'Isaac Watts; coro y música Ralph E. Hudson · Trad. Pedro Grado Valdés (1862-1923)',
 'himno',
 'Eb',
 115,
 '4/4',
 'Semana Santa',
 'cruz, salvación, testimonio',
 '{start_of_verse: Estrofa 1}
[Eb]Me hirió el [Ab]pecado, fui a [Eb]Jesús,
[Bb]mostrele mi dolor;
[Eb]perdido, errante, [Ab]vi su [Eb]luz,
[Bb]bendíjome en su [Eb]amor.
{end_of_verse}

{start_of_chorus: Coro}
[Eb]En la cruz, en la cruz,
[Bb]do primero vi la luz,
[Ab]y las manchas de mi alma yo [Eb]lavé;
[Ab]fue allí por la [Eb]fe do vi a [Bb]Jesús,
[Bb]y feliz para siempre [Eb]seré.
{end_of_chorus}

{start_of_verse: Estrofa 2}
[Eb]En una cruz [Ab]mi buen [Eb]Señor
[Bb]su sangre derramó
[Eb]por este [Ab]pobre [Eb]pecador
[Bb]a quien así [Eb]salvó.
{end_of_verse}

{start_of_verse: Estrofa 3}
[Eb]Venció la [Ab]muerte, ¡qué [Eb]placer!,
[Bb]y el Padre lo exaltó;
[Eb]espero solo [Ab]en su [Eb]poder,
[Bb]morir no temo [Eb]yo.
{end_of_verse}

{start_of_verse: Estrofa 4}
[Eb]Aunque él se [Ab]fue, conmigo [Eb]está
[Bb]el gran Consolador;
[Eb]por él [Ab]entrada tengo [Eb]ya
[Bb]al reino del [Eb]Señor.
{end_of_verse}

{start_of_verse: Estrofa 5}
[Eb]Vivir en Cristo [Ab]trae la [Eb]paz,
[Bb]con él habitaré;
[Eb]ya suyo soy y [Ab]de hoy en [Eb]más
[Bb]a nadie [Eb]temeré.
{end_of_verse}',
 'X:1
T:En la cruz (Me hirió el pecado)
T:(HUDSON)
M:4/4
L:1/4
Q:1/4=115
K:Eb
E | G3/2 F/ E G | B3/2 A/ G
B | c B A G | F3
E | G3/2 F/ E G | B3/2 c/ B
E | F A G F | E3 ||
E3/4 F/4 | G G3/4 G/4 G
A/ G/ | (G/F/) F3/4 E/4 F
F/ G/ | A/ A/ A/ A/ A B3/4 A/4 | G3
G/ G/ | A A C A/ A/ | G (G/F/) E
G | F F/ E/ D/ A/ G3/4 F/4 | E3 |]',
 'Cantar el coro después de cada estrofa.',
 1),

('Hay un mundo feliz más allá',
 'Henry G. Jackson (1838-1914) / Joseph P. Webster',
 'himno',
 'G',
 100,
 '4/4',
 'Adoración',
 'cielo, esperanza, eternidad',
 '{start_of_verse: Estrofa 1}
[G]Hay un mundo [C]feliz más [G]allá,
[G]donde cantan los santos en [D]luz,
[G]tributando su [C]eterno [G]loor
[G]al invicto, [D]glorioso [G]Jesús.
{end_of_verse}

{start_of_chorus: Coro}
[G]En el mundo feliz
[D]reinaremos con nuestro [G]Señor;
[C]en el mundo [G]feliz
[D]reinaremos con nuestro [G]Señor.
{end_of_chorus}

{start_of_verse: Estrofa 2}
[G]Cantaremos con [C]gozo a [G]Jesús,
[G]al Cordero que nos [D]rescató,
[G]y con sangre [C]vertida en la [G]cruz
[G]los pecados [D]del mundo [G]quitó.
{end_of_verse}

{start_of_verse: Estrofa 3}
[G]Para siempre en [C]el mundo [G]feliz
[G]con los santos daremos [D]honor
[G]al invicto, [C]glorioso [G]Jesús,
[G]a Jesús, nuestro [D]Rey y [G]Señor.
{end_of_verse}',
 'X:1
T:Hay un mundo feliz más allá
T:(SWEET BY AND BY)
M:4/4
L:1/4
Q:1/4=100
K:G
G3/4 A/4 | B A/ G/ A G3/4 E/4 | D3
G3/4 A/4 | B B/ B/ d d3/4 B/4 | A3
G3/4 A/4 | B A/ G/ A G3/4 E/4 | D3
G3/4 A/4 | B A/ G/ A G/ F/ | G3 ||
B3/4 c/4 | d3 d3/4 B/4 | A3
A/ B/ | c c/ c/ c B/ A/ | B3
B3/4 c/4 | d3 B3/4 A/4 | G3
F/ E/ | D G/ B/ A G/ F/ | G3 |]',
 'Cantar el coro después de cada estrofa.',
 1),

('Dios os guarde',
 'Jeremiah E. Rankin / William G. Tomer · Trad. anónima',
 'himno',
 'C',
 105,
 '4/4',
 'Adoración',
 'despedida, bendición, cierre',
 '{start_of_verse: Estrofa 1}
[C]Dios os guarde [G]siempre en santo [C]amor;
[F]en la senda [C]peligrosa
[C]de esta vida tormentosa
[C]os conserve en [G]paz y sin [C]temor.
{end_of_verse}

{start_of_chorus: Estribillo}
[C]Al venir [F]Jesús nos [C]veremos
[G]a los pies de nuestro Salvador;
[C]reunidos [F]todos [C]seremos
[C]un redil con [G]nuestro Buen [C]Pastor.
{end_of_chorus}

{start_of_verse: Estrofa 2}
[C]Dios os guarde [G]siempre en santo [C]amor;
[F]os conduzca su [C]bandera,
[C]y os esfuerce en gran manera
[C]con su [G]Espíritu [C]consolador.
{end_of_verse}

{start_of_verse: Estrofa 3}
[C]Dios os guarde [G]siempre en santo [C]amor
[F]hasta el día en que [C]lleguemos
[C]a la patria do estaremos
[C]para siempre [G]con el [C]Salvador.
{end_of_verse}

{start_of_verse: Estrofa 4}
[C]Dios os guarde [G]siempre en santo [C]amor;
[F]con su gracia os [C]sostenga,
[C]hasta que en justicia venga
[C]Jesucristo, [G]nuestro [C]redentor.
{end_of_verse}',
 'X:1
T:Dios os guarde
T:(GOD BE WITH YOU (Tomer))
M:4/4
L:1/4
Q:1/4=105
K:C
E3/2 E/ E/E/ E/E/ | G D E2 |
A3/2 A/ A/A/ A/A/ | A2 G2 |
G3/2 G/ G/G/ G/G/ | G2 E2 |
E3/2 E/ A/G/ C/D/ | E D C |
E3/4 F/4 | (G c e) d3/4c/4 | (A c2)
B3/4 A/4 | G3/2 A/ (G/E/) (C/E/) | D3
E3/4 F/4 | (G c e) d3/4c/4 | (A c2)
c3/4A/4 | G/E/ C/D/ E D | C3 |]',
 'Himno de despedida. Cantar el estribillo después de cada estrofa.',
 1),

('Jesús, yo he prometido',
 'John E. Bode / Arthur H. Mann · Trad. Juan B. Cabrera (1837-1916)',
 'himno',
 'G',
 110,
 '4/4',
 'Adoración',
 'consagración, servicio, compromiso',
 '{start_of_verse: Estrofa 1}
[G]Jesús, yo he [D]prometido
[C]servirte con [G]amor;
[G]concédeme [C]tu [G]gracia,
[D]mi amigo y [D7]Salvador.
[G]No temeré la [D]lucha
[C]si tú a mi lado [G]estás,
[C]ni perderé [G]el [Em]camino
[C]si tú [D]guiando [G]vas.
{end_of_verse}

{start_of_verse: Estrofa 2}
[G]El mundo está muy [D]cerca,
[C]y abunda [G]tentación;
[G]suave es [C]el [G]engaño
[D]y es necia la [D7]pasión;
[G]ven tú, Jesús, más [D]cerca
[C]mostrando tu [G]piedad,
[C]y escuda [G]al alma [Em]mía
[C]de [D]toda [G]iniquidad.
{end_of_verse}

{start_of_verse: Estrofa 3}
[G]Cuando mi mente [D]vague
[C]ya incierta, ya [G]veloz,
[G]concédeme [C]que [G]escuche,
[D]Jesús, tu clara [D7]voz;
[G]anímame si [D]paro;
[C]inspírame [G]también;
[C]repréndeme, [G]si [Em]temo
[C]en todo [D]hacer el [G]bien.
{end_of_verse}

{start_of_verse: Estrofa 4}
[G]Jesús, tú has [D]prometido
[C]a todo aquel que [G]va
[G]siguiendo [C]tus [G]pisadas,
[D]que al cielo [D7]llegará.
[G]Sostenme en el [D]camino,
[C]y al fin con dulce [G]amor
[C]trasládame a [G]tu [Em]gloria,
[C]mi amigo [D]y [G]Salvador.
{end_of_verse}',
 'X:1
T:Jesús, yo he prometido
T:(ANGEL''S STORY)
M:4/4
L:1/4
Q:1/4=110
K:G
B | B3/2 B/ A G | G2 F D | c3/2 c/ B A | B3 B | d3/2 d/ c B | B2 c B | A3/2 G/ F G | A3 ^A |
B3/2 B/ A G | G2 F D | c3/2 c/ B A | B3 B | e3/2 d/ c B | d2 c E | G3/2 F/ E F | G3 |]',
 NULL,
 1),

('Objeto de mi fe',
 'Ray Palmer / Lowell Mason · Trad. Thomas M. Westrup (1837-1909)',
 'himno',
 'Eb',
 108,
 '4/4',
 'Adoración',
 'fe, consagración, confianza',
 '{start_of_verse: Estrofa 1}
[Eb]Objeto de mi [Ab]fe,
[Bb]divino [Eb]Salvador,
[F]propicio [Bb]sé;
[Eb]Cordero de mi [Bb]Dios,
[Eb]libre por tu [Bb]bondad,
[Ab]libre de mi [Eb]maldad
[Bb]me quiero [Eb]ver.
{end_of_verse}

{start_of_verse: Estrofa 2}
[Eb]Consagra el [Ab]corazón
[Bb]que ha de [Eb]pertenecer
[F]a ti no [Bb]más;
[Eb]calmar, [Bb]fortalecer,
[Eb]gracia [Bb]comunicar,
[Ab]mi celo [Eb]acrecentar
[Bb]te [Eb]dignarás.
{end_of_verse}

{start_of_verse: Estrofa 3}
[Eb]La senda al [Ab]recorrer
[Bb]oscura y de [Eb]dolor
[F]me has de [Bb]guiar;
[Eb]así tendré [Bb]valor,
[Eb]así podré [Bb]vivir,
[Ab]así podré [Eb]morir
[Bb]en dulce [Eb]paz.
{end_of_verse}

{start_of_verse: Estrofa 4}
[Eb]Pues el camino [Ab]sé,
[Bb]de célica [Eb]mansión
[F]luz y [Bb]solaz;
[Eb]bendito [Bb]Salvador,
[Eb]tú eres esa [Bb]verdad,
[Ab]vida, confianza, [Eb]amor,
[Bb]mi eterna [Eb]paz.
{end_of_verse}',
 'X:1
T:Objeto de mi fe
T:(OLIVET)
M:4/4
L:1/4
Q:1/4=108
K:Eb
E2 G B | B3/2 A/ G2 | F2 F A | A3/2 G/ F2 | G2 F c | B4 |
B2 G A | B3/2 c/ B2 | B2 G A | B3/2 c/ B2 | e2 d c | B3/2 A/ G
E | F2 B2 | E4 |]',
 'En la 3.ª estrofa el himnario de 1895 dice "oscuro"; se usa "oscura" (concuerda con "senda").',
 1),

('Cariñoso Salvador',
 'Charles Wesley / Simeon B. Marsh · Trad. Thomas M. Westrup (1837-1909)',
 'himno',
 'F',
 95,
 '3/4',
 'Adoración',
 'refugio, confianza, consuelo',
 '{start_of_verse: Estrofa 1}
[F]Cariñoso [C]Salvador,
[F]huyo de [C]la [F]tempestad
[F]a tu seno [C]protector,
[F]fiándome de [C]tu [F]bondad.
[F]Sálvame, [Bb]Señor [F]Jesús,
[F]de las [Bb]olas del [F]turbión;
[F]hasta el puerto de [C]salud
[F]guía mi [C]pobre [F]embarcación.
{end_of_verse}

{start_of_verse: Estrofa 2}
[F]Otro asilo ninguno [C]hay:
[F]indefenso acudo [C]a [F]ti;
[F]mi necesidad me [C]trae,
[F]porque mi [C]peligro [F]vi.
[F]Solamente en [Bb]ti, [F]Señor,
[F]creo tener [Bb]consuelo y [F]luz;
[F]vengo lleno de [C]temor
[F]a los pies [C]de mi [F]Jesús.
{end_of_verse}

{start_of_verse: Estrofa 3}
[F]Cristo, encuentro todo en [C]ti,
[F]y no [C]necesito [F]más;
[F]caído me pusiste en [C]pie;
[F]débil, ánimo [C]me [F]das;
[F]al enfermo [Bb]das [F]salud,
[F]guías tierno al [Bb]que no [F]ve;
[F]con amor y [C]gratitud
[F]tu [C]bondad [F]ensalzaré.
{end_of_verse}',
 'X:1
T:Cariñoso Salvador
T:(MARTYN)
M:3/4
L:1/4
Q:1/4=95
K:F
A A/ A F/ | G G/ G3/2 | A A/ c B/ | A3/2 G3/2 | F3 |
A A/ A F/ | G G/ G3/2 | A A/ c B/ | A3/2 G3/2 | F3 |
c c/ c c/ | d3/2 d3/2 | c3 | c c/ c c/ | d3/2 d3/2 | c3 |
A A/ A F/ | G G/ G3/2 | A A/ c B/ | A3/2 G3/2 | F3 |]',
 'Tonada MARTYN (el himnario de 1895 usa REFUGE, del mismo metro 7.7.7.7 D).',
 1),

('Cerca de ti, Señor',
 'Thomas M. Westrup (1837-1909) / Lowell Mason',
 'himno',
 'F',
 110,
 '4/4',
 'Adoración',
 'comunión, intimidad, cielo',
 '{start_of_verse: Estrofa 1}
[F]Cerca de ti, [Bb]Señor,
[F]quiero [C]morar;
[F]lo tierno de tu [Bb]amor
[F]quiero [C]goz[F]ar.
[F]Llena mi [Bb]pobre [F]ser,
[F]limpia mi [C]corazón,
[F]hazme tu rostro [Bb]ver
[F]en [C]tu [F]mansión.
{end_of_verse}

{start_of_verse: Estrofa 2}
[F]Pasos inciertos [Bb]doy,
[F]el sol se [C]va;
[F]mas si contigo [Bb]estoy
[F]no [C]temo [F]ya.
[F]Himnos [Bb]de [F]gratitud
[F]ferviente [C]cantaré,
[F]y fiel a ti, [Bb]Jesús,
[F]siempre [C]ser[F]é.
{end_of_verse}

{start_of_verse: Estrofa 3}
[F]Día feliz [Bb]veré
[F]creyendo en [C]ti,
[F]en que [Bb]habitaré
[F]cerca [C]de [F]ti.
[F]Mi [Bb]voz [F]alabará
[F]tu dulce nombre [C]allí,
[F]y mi alma [Bb]gozará
[F]cerca [C]de [F]ti.
{end_of_verse}',
 'X:1
T:Cerca de ti, Señor
T:(BETHANY)
M:4/4
L:1/4
Q:1/4=110
K:F
A2 G F | F3/2 D/ D2 | C2 F A | G4 |
A2 G F | F3/2 D/ D2 | (C F) E G | F4 |
c2 d c | c3/2 A/ c2 | c2 d c | c3/2 A/ G2 |
A2 G F | F3/2 D/ D2 | (C F) E G | F4 |]',
 NULL,
 1),

('Salvo en los tiernos brazos',
 'Fanny J. Crosby / W. Howard Doane · Trad. Juan B. Cabrera (1837-1916)',
 'himno',
 'G',
 110,
 '4/4',
 'Adoración',
 'seguridad, descanso, consuelo',
 '{start_of_verse: Estrofa 1}
[G]Salvo en [C]los tiernos [G]brazos
[G]de mi Jesús [D]seré,
[G]y en [C]su amoroso [G]pecho
[D]siempre [G]reposaré.
[D]Este es sin duda el eco
[A]de celestial [D]canción,
[D]que de inefable [A]gozo
[D]llena mi [D7]corazón.
{end_of_verse}

{start_of_chorus: Coro}
[G]Salvo en [C]los tiernos [G]brazos
[G]de mi Jesús [D]seré,
[G]y en [C]su amoroso [G]pecho
[D]siempre [G]reposaré.
{end_of_chorus}

{start_of_verse: Estrofa 2}
[G]Tiende Jesús [C]los [G]brazos,
[G]bríndame su [D]amistad;
[G]a su [C]poder me [G]acojo;
[D]no hay para mí [G]ansiedad.
[D]No temeré si ruge
[A]hórrida [D]tentación;
[D]ni causará el [A]pecado
[D]daño en mi [D7]corazón.
{end_of_verse}

{start_of_verse: Estrofa 3}
[G]De sus [C]amantes [G]brazos
[G]tierna [D]solicitud
[G]líbrame [C]de [G]tristeza,
[D]líbrame de [G]inquietud.
[D]Y si tal vez hay pruebas,
[A]fáciles [D]pasarán;
[D]lágrimas si [A]vertiere,
[D]pronto se [D7]enjugarán.
{end_of_verse}

{start_of_verse: Estrofa 4}
[G]Y cruzaré [C]la [G]noche
[G]lóbrega, sin [D]temor,
[G]hasta que [C]venga el [G]día
[D]de perennal [G]fulgor;
[D]¡cuán placentero entonces
[A]con él será [D]morar,
[D]y en la mansión de [A]gloria
[D]con mi Jesús [D7]reinar!
{end_of_verse}',
 'X:1
T:Salvo en los tiernos brazos
T:(SAFE IN THE ARMS OF JESUS)
M:4/4
L:1/4
Q:1/4=110
K:G
B A3/4 G/4 D G | (B3/2 c/) B2 | d e3/4 d/4 B G | A4 | B A3/4 G/4 D G | (B3/2 c/) d2 | (d/c/) B/ A/ G F | G4 |
A A3/4 B/4 A A | A2 d2 | ^c c3/4 c/4 B A | (A2 d2) | A A3/4 B/4 A d | d2 B2 | A ^c3/4 d/4 e c | d2 c2 ||
B A3/4 G/4 D G | (B3/2 c/) B2 | d e3/4 d/4 B G | A4 | B A3/4 G/4 D G | (B3/2 c/) d2 | (d/c/) B/ A/ G F | G4 |]',
 'Cantar el coro después de cada estrofa.',
 1),

('No me pases',
 'Fanny J. Crosby / W. Howard Doane · Trad. anónima (1895)',
 'himno',
 'Ab',
 107,
 '4/4',
 'Adoración',
 'oración, clamor, misericordia',
 '{start_of_verse: Estrofa 1}
[Ab]No me pases, [Db]no me [Ab]olvides,
[Eb]tierno Salvador;
[Ab]muchos gozan [Db]tus [Ab]mercedes,
[Eb]oye mi [Ab]clamor.
{end_of_verse}

{start_of_chorus: Coro}
[Ab]Cristo, Cristo,
[Db]oye tú mi [Ab]voz;
[Ab]Salvador, tu [Db]gracia [Ab]dame,
[Eb]oye mi [Ab]clamor.
{end_of_chorus}

{start_of_verse: Estrofa 2}
[Ab]Ante el trono [Db]de tu [Ab]gracia
[Eb]hallo dulce paz;
[Ab]nada aquí [Db]mi alma [Ab]sacia;
[Eb]tú eres mi [Ab]solaz.
{end_of_verse}

{start_of_verse: Estrofa 3}
[Ab]Solo fío [Db]en tus [Ab]bondades,
[Eb]guíame en tu luz,
[Ab]y mi [Db]alma no [Ab]deseches,
[Eb]sálvame, [Ab]Jesús.
{end_of_verse}

{start_of_verse: Estrofa 4}
[Ab]Fuente viva [Db]de [Ab]consuelo
[Eb]tú eres para mí;
[Ab]¿a quién tengo [Db]en este [Ab]suelo
[Eb]sino solo a [Ab]ti?
{end_of_verse}',
 'X:1
T:No me pases
T:(PASS ME NOT)
M:4/4
L:1/4
Q:1/4=107
K:Ab
c3/2 B/ A3/4 G/4 A3/4 F/4 | E2 A2 | B3/2 B/ A B | c4 |
c3/2 B/ A3/4 G/4 A3/4 F/4 | E2 A2 | B3/2 A/ c B | A4 ||
e2 c2 | (B3/2 A/) F2 | E A c A | B4 |
c3/2 B/ A3/4 G/4 A3/4 F/4 | E2 A2 | B3/2 A/ c B | A4 |]',
 'Cantar el coro después de cada estrofa.',
 1),

('Dime la antigua historia',
 'A. Katherine Hankey / W. Howard Doane · Trad. Juan B. Cabrera (1837-1916)',
 'himno',
 'C',
 112,
 '4/4',
 'Misiones',
 'evangelio, testimonio',
 '{start_of_verse: Estrofa 1}
[C]Dime la [F]antigua [C]historia
[C]del celestial [G]favor,
[C]de Cristo y [F]de su [C]gloria,
[G]de Cristo y de su [C]amor.
[G]Dímela con [C]llaneza
[D]propia de la [G]niñez,
[C]porque es [F]mi mente [C]flaca
[G]y anhela [C]sencillez.
{end_of_verse}

{start_of_chorus: Coro}
[C]Dime la antigua [F]historia,
[G]cuéntame la [C]victoria,
[C]háblame de la [F]gloria
[C]de Cristo y [G]de su [C]amor.
{end_of_chorus}

{start_of_verse: Estrofa 2}
[C]Dime esa [F]grata [C]historia
[C]con lentitud, y [G]así
[C]conoceré [F]la [C]obra
[G]que Cristo hizo por [C]mí.
[G]Dímela con [C]frecuencia;
[D]soy dado a [G]olvidar,
[C]y el [F]matinal [C]rocío
[G]suele el sol [C]disipar.
{end_of_verse}

{start_of_verse: Estrofa 3}
[C]Dime tan [F]dulce [C]historia
[C]con tono claro y [G]fiel:
[C]murió Jesús, [F]y [C]salvo
[G]yo quiero ser por [C]él.
[G]Dime esa historia [C]siempre,
[D]si en tiempo de [G]aflicción
[C]deseas a [F]mi [C]alma
[G]traer [C]consolación.
{end_of_verse}',
 'X:1
T:Dime la antigua historia
T:(TELL ME THE OLD, OLD STORY)
M:4/4
L:1/4
Q:1/4=112
K:C
E E3/4 F/4 G G | A2 G
G | c c c (E3/4^F/4) | G3
G | c c (c/B/) (A/G/) | (A B) c
A | G (F/E/) D (G/F/) | E4 |
(D3/4C/4) D3/4 E/4 F F | (E3/4F/4) G2
G | (^F/G/) (A/B/) c F | G3
G | c c (c/B/) (A/G/) | (A B) c
A | G (F/E/) D (G/F/) | E4 ||
E E3/4 F/4 G G | A2 G2 |
B B3/4 c/4 d d | d2 c2 |
e e3/4 d/4 c c | c2 A
A | G c (B/c/) d | c4 |]',
 'Cantar el coro después de cada estrofa.',
 1),

('¡Oh dulce, grata oración!',
 'William W. Walford / William B. Bradbury · Trad. anónima (1895)',
 'himno',
 'D',
 78,
 '6/8',
 'Adoración',
 'oración, comunión',
 '{start_of_verse: Estrofa 1}
[D]¡Oh dulce, [G]grata [D]oración!
[A]Tú del contacto mundanal
[D]me elevarás [G]a la [D]mansión
[A]del tierno Padre [D]celestial.
[D]Huyendo yo [G]la [D]tentación
[D]y toda influencia [A]terrenal,
[D]por Cristo que [G]murió por [D]mí
[A]será mi ruego oído [D]allí.
{end_of_verse}

{start_of_verse: Estrofa 2}
[D]¡Oh dulce, [G]grata [D]oración!
[A]A quien escucha con bondad
[D]elevas tú [G]mi [D]corazón,
[A]a Dios que ama con [D]verdad.
[D]Espero yo [G]su [D]bendición,
[D]perfecta paz y [A]santidad,
[D]por Cristo que [G]murió por [D]mí,
[A]por el que me ha salvado [D]aquí.
{end_of_verse}

{start_of_verse: Estrofa 3}
[D]¡Oh Padre mío, [G]Dios de [D]amor!,
[A]escucha tú mi oración.
[D]¡Oh Cristo, [G]mi fiel [D]Salvador!,
[A]escucha tú mi [D]oración.
[D]¡Espíritu [G]Consol[D]ador!,
[D]escucha tú mi [A]oración.
[D]Bendíceme, [G]oh [D]Trinidad,
[A]que estás en la [D]eternidad.
{end_of_verse}',
 'X:1
T:¡Oh dulce, grata oración!
T:(SWEET HOUR)
M:6/8
L:1/8
Q:1/4=78
K:D
D | F2 G A2 A | B2 c d2
B | A2 F (FE) D | E2 F E2
D | F2 G A2 A | B2 c d2
B | A2 F (FE) D | F2 E D2
A | d2 c d2 B | A2 F A2
A | d2 c d2 B | A2 F E2
D | F2 G A2 A | B2 c d2
B | A2 F (FE) D | F2 E D2 |]',
 NULL,
 1);

-- 1. Quita lo que dejó la versión anterior de este script y ya no forma parte de la
--    biblioteca (fichas sin letra o himnos descartados), salvo que se use en algún programa.
DELETE c FROM alabanza_canciones c
LEFT JOIN tmp_canciones t ON t.titulo = c.titulo
WHERE c.usuario = 'biblioteca-inicial'
  AND t.titulo IS NULL
  AND NOT EXISTS (SELECT 1 FROM actividades_programa p WHERE p.idcanciones = c.idcanciones);

-- 2. Actualiza los himnos que ya había cargado este script
UPDATE alabanza_canciones c
JOIN tmp_canciones t ON t.titulo = c.titulo
SET c.autor = t.autor, c.tipo = t.tipo, c.tonalidad = t.tonalidad, c.bpm = t.bpm, c.compas = t.compas,
    c.categoria = t.categoria, c.etiquetas = t.etiquetas, c.letra_acordes = t.letra_acordes,
    c.partitura_abc = t.partitura_abc, c.notas = t.notas, c.dominio_publico = t.dominio_publico
WHERE c.usuario = 'biblioteca-inicial';

-- 3. Inserta los que aún no existen (por título)
INSERT INTO alabanza_canciones
  (titulo, autor, tipo, tonalidad, bpm, compas, categoria, etiquetas, letra_acordes, partitura_abc, notas, dominio_publico, activo, usuario)
SELECT t.titulo, t.autor, t.tipo, t.tonalidad, t.bpm, t.compas, t.categoria, t.etiquetas, t.letra_acordes, t.partitura_abc,
       t.notas, t.dominio_publico, 1, 'biblioteca-inicial'
FROM tmp_canciones t
WHERE NOT EXISTS (SELECT 1 FROM alabanza_canciones c WHERE c.titulo = t.titulo);

DROP TEMPORARY TABLE IF EXISTS tmp_canciones;

-- Resumen
SELECT categoria, COUNT(*) AS himnos
FROM alabanza_canciones
WHERE usuario = 'biblioteca-inicial'
GROUP BY categoria
ORDER BY himnos DESC;
