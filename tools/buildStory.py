# Genera data/story.json (español) y i18n/en.story.json (diccionario ES→EN). Ejecutar desde la raíz del juego.
import json
old=json.load(open('data/story.json',encoding='utf-8'))
EN={}
def T(es,en):
    EN[es]=en; return es
def V(*pairs):
    return [T(es,en) for es,en in pairs]
def R(mn=None,mx=None):
    r={}
    if mn is not None: r['min']=mn
    if mx is not None: r['max']=mx
    return r
lines=[]
def L(id,speaker,expr,when,variants,priority=1,oncePer=None,chance=None,gift=None,name=None,requires=None):
    d={"id":id,"speaker":speaker,"expression":expr,"priority":priority,"when":when,"variants":variants}
    if oncePer: d["oncePer"]=oncePer
    if chance is not None: d["chance"]=chance
    if gift: d["gift"]=gift
    if name: d["name"]=T(*name) if isinstance(name,tuple) else name
    if requires: d["requires"]=requires
    lines.append(d)

NAME_JOY=("ENFERMERA JOY","NURSE JOY"); NAME_JENNY=("OFICIAL JENNY","OFFICER JENNY")

# ---------- PRESENTACIONES (primera aparición de cada personaje) ----------
L("asloFirst","aslo","neutral",{"phase":["combat"],"nodeType":["rival"]},V(
 ("Soy Aslo. Dicen que soy tu rival, así que prepárate: voy a ponerte las cosas difíciles en cada ruta.",
  "I'm Aslo. They say I'm your rival, so get ready: I'm going to make every route hard for you.")),priority=2,name="ASLO")
L("joyIntro","joy","neutral",{"phase":["center"]},V(
 ("Soy la enfermera Joy y atiendo los Centros Pokémon de Panhea. Déjame a tu equipo: lo curo y revivo por completo.",
  "I'm Nurse Joy and I run the Pokémon Centers of Panhea. Leave your team with me: I'll heal and revive them completely.")),priority=2,name=NAME_JOY)
L("jennyIntro","jenny","neutral",{"phase":["map"]},V(
 ("Soy la oficial Jenny. Patrullo las rutas de Panhea para que viajar sea seguro. Si ves algo raro, avísame.",
  "I'm Officer Jenny. I patrol the routes of Panhea to keep travel safe. If you see anything strange, let me know.")),priority=2,name=NAME_JENNY)
L("linaIntro","lina","neutral",{"phase":["camp","shop"]},V(
 ("Hola, soy Lina. Me encargo del campamento y de la tienda: reparto suministros a quienes cruzan Panhea. Si mis manos están frías, no te asustes; siempre fueron así.",
  "Hi, I'm Lina. I look after the camp and the shop: I hand out supplies to everyone crossing Panhea. If my hands feel cold, don't be scared; they've always been that way.")),priority=2,name="LINA")
orgIntro=[("rocket",["kanto","johto"],"TEAM ROCKET",
  ("Somos el Team Rocket. Esta ruta es nuestra: entrega tus Pokémon o prepárate para pelear.","We are Team Rocket. This route is ours: hand over your Pokémon or get ready to fight.")),
 ("hoenn",["hoenn"],"TEAM AQUA / MAGMA",
  ("Somos el Team Aqua y el Team Magma, por una vez del mismo lado. Estorbas en nuestros planes.","We are Team Aqua and Team Magma, on the same side for once. You're getting in the way of our plans.")),
 ("galaxia",["sinnoh"],"TEAM GALAXIA",
  ("Somos el Team Galaxia. Buscamos crear un mundo nuevo y perfecto, y tú no cabes en él.","We are Team Galactic. We seek to create a new, perfect world, and there's no room in it for you.")),
 ("plasma",["unova"],"TEAM PLASMA",
  ("Somos el Team Plasma. Vamos a liberar a los Pokémon de entrenadores como tú.","We are Team Plasma. We will free Pokémon from trainers like you."))]
for key,regs,nm,txt in orgIntro:
    L(f"villainIntro_{key}","villain","neutral",{"phase":["combat"],"nodeType":["villain"],"region":regs},V(txt),priority=2,name=(nm,{"TEAM GALAXIA":"TEAM GALACTIC"}.get(nm,nm)))

# ---------- AMELIE ----------
L("welcome","amelie","smile",{"phase":["map"],"badges":R(0,0)},V(
 ("¡Te doy la bienvenida a Panhea! Soy la profesora Amelie. Aquí conviven Pokémon de cinco regiones. Elige tu ruta; yo te acompaño.",
  "Welcome to Panhea! I'm Professor Amelie. Pokémon from five regions live together here. Choose your route; I'll be with you."),
 ("Llegaste a Panhea. Soy Amelie, investigadora de este lugar. Los Pokémon de Kanto, Johto, Hoenn, Sinnoh y Teselia viven juntos. Escoge por dónde empezar.",
  "You've arrived in Panhea. I'm Amelie, a researcher here. Pokémon from Kanto, Johto, Hoenn, Sinnoh and Unova live side by side. Pick where to start."),
 ("Hola. Panhea es un mundo donde las regiones se mezclan. Elige tu primer camino y yo te guío.",
  "Hello. Panhea is a world where regions blend together. Choose your first path and I'll guide you.")),priority=2)
L("amelieAbout","amelie","smile",{"phase":["map"],"badges":R(0,1)},V(
 ("Llevo años estudiando cómo conviven los Pokémon de regiones distintas. Panhea es mi laboratorio favorito… y tú, la mejor investigación que he tenido.",
  "I've spent years studying how Pokémon from different regions live together. Panhea is my favorite lab… and you are the best research I've ever had."),
 ("Mi trabajo es observar cómo se adaptan los Pokémon a un mundo nuevo. Verte viajar con los tuyos es mi parte favorita.",
  "My job is to watch how Pokémon adapt to a new world. Seeing you travel with yours is my favorite part.")),priority=2)
L("tipCombat","amelie","neutral",{"phase":["combat"],"badges":R(0,0)},V(
 ("Elige un Pokémon, cárgale energía y después una técnica. Las técnicas LIBRE no gastan cartas.",
  "Pick a Pokémon, load it with energy, then choose a move. FREE moves don't spend cards."),
 ("Primero energía, luego el movimiento. Si usas una técnica libre, no pierdes cartas de la mano.",
  "Energy first, then the move. If you use a free move, you don't lose cards from your hand."),
 ("Recuerda: selecciona un Pokémon, asigna energía y usa la técnica. Las LIBRE son gratuitas.",
  "Remember: select a Pokémon, assign energy and use the move. FREE ones cost nothing.")),priority=3)
L("amelieStarter","amelie","wink",{"phase":["combat"],"badges":R(0,1),"turnMin":2},V(
 ("Ese compañero que elegiste… se nota que se llevan bien. Me recuerda a alguien.",
  "That partner you chose… it's obvious you two get along. It reminds me of someone.")),priority=2)
L("tipRows","amelie","neutral",{"phase":["combat"],"badges":R(0,1),"turnMin":2},V(
 ("La fila frontal protege a la trasera de los ataques cuerpo a cuerpo. Ubica bien a tu equipo.",
  "The front row shields the back row from melee attacks. Position your team carefully."),
 ("Los de adelante bloquean los golpes cuerpo a cuerpo a los de atrás. Ordena tu formación con cuidado.",
  "Those in front block melee hits aimed at those behind. Arrange your formation with care."),
 ("Frontal = escudo contra el cuerpo a cuerpo. Acomoda a tus Pokémon según sus ataques.",
  "Front = shield against melee. Arrange your Pokémon according to their attacks.")),priority=3)
L("tipCapture","amelie","wink",{"phase":["reward"],"capturePending":True,"badges":R(0,2)},V(
 ("¡Puedes capturarlo! Un equipo variado cubre más tipos. Si ya tienes 6, va a la caja.",
  "You can capture it! A varied team covers more types. If you already have 6, it goes to the box."),
 ("Esta es tu oportunidad de capturar. Más tipos en el equipo = más opciones. La caja guarda el resto.",
  "This is your chance to capture. More types on the team = more options. The box keeps the rest."),
 ("Captúralo si te sirve. La variedad de tipos ayuda. El equipo activo admite 6.",
  "Capture it if it helps you. Type variety helps. The active team holds 6.")),priority=3)
L("firstBadge","amelie","happy",{"phase":["map"],"badges":R(1,1)},V(
 ("¡Tu primera medalla! Sabía que lo lograrías. Vas a ser un gran entrenador.",
  "Your first badge! I knew you could do it. You're going to be a great trainer."),
 ("Primera medalla conseguida. Sigue así, el camino de la Liga apenas empieza.",
  "First badge earned. Keep it up, the road to the League has only just begun."),
 ("Bien hecho. Una medalla más y el mundo de Panhea se abre un poco más.",
  "Well done. One more badge and the world of Panhea opens up a little more.")),priority=2)
L("amelieRoutes","amelie","think",{"phase":["map"],"badges":R(1,2)},V(
 ("Diseñé las rutas para que cada región tuviera su carácter: Kanto es nostalgia, Johto es calma, Hoenn es fuerza, Sinnoh es misterio y Teselia, novedad.",
  "I designed the routes so each region would have its own character: Kanto is nostalgia, Johto is calm, Hoenn is strength, Sinnoh is mystery and Unova is novelty.")),priority=2)
L("centerFirst","amelie","wink",{"phase":["center"],"badges":R(0,4)},V(
 ("¡Qué alivio! Los Centros Pokémon de Panhea los diseñé yo misma. ¿Se nota?",
  "What a relief! I designed the Pokémon Centers of Panhea myself. Can you tell?"),
 ("Bienvenido al Centro. Los armé pensando en que siempre tuvieras un lugar seguro.",
  "Welcome to the Center. I built them so you'd always have a safe place."),
 ("Aquí se cura todo. Los diseñé para que nunca te quedes sin opciones.",
  "Everything gets healed here. I designed them so you'd never run out of options.")),priority=2)
L("amelieCamp","amelie","smile",{"phase":["camp"],"badges":R(1,3)},V(
 ("Un campamento… me gusta cómo se ve el fuego desde aquí. Es curioso: recuerdo una fogata, pero no sé dónde fue.",
  "A camp… I like how the fire looks from here. Funny: I remember a campfire, but I can't say where it was.")),priority=2)
L("amelieLina","amelie","gentle",{"phase":["shop"],"badges":R(2,3)},V(
 ("Lina cuida el campamento y la tienda desde que empecé este proyecto. Es callada, pero se preocupa por todos los viajeros.",
  "Lina has looked after the camp and the shop since I started this project. She's quiet, but she cares about every traveler.")),priority=2)
L("amelieMemory","amelie","think",{"phase":["center"],"badges":R(2,3)},V(
 ("En los Centros veo pasar a todos los viajeros, y los recuerdo con mucha nitidez. A ti, un poco más.",
  "In the Centers I watch every traveler pass through, and I remember them all very clearly. You, a little more.")),priority=2)
L("amelieNotes","amelie","grin",{"phase":["map"],"badges":R(2,3)},V(
 ("Anoto todo lo que haces: combos, formaciones, hasta cómo cuidas a tu equipo. Algún día lo leerás.",
  "I write down everything you do: combos, formations, even how you look after your team. Someday you'll read it.")),priority=2)
L("amelieWorry","amelie","worried",{"phase":["combat"],"badges":R(2,3),"turnMin":3},V(
 ("¡Cuidado con ese golpe! …Perdona, me emociono cuando peleas. Es como si cada combate fuera mío también.",
  "Watch out for that hit! …Sorry, I get carried away when you fight. It's as if every battle were mine too.")),priority=2)
L("amelieProud","amelie","happy",{"phase":["map"],"badges":R(3,3)},V(
 ("Tres medallas. Ya mereces un lugar en mis notas. Cada viaje merece quedar escrito.",
  "Three badges. You already deserve a place in my notes. Every journey deserves to be written down.")),priority=2)
L("tipGym","amelie","think",{"phase":["map"],"nextNode":"gym","badges":R(0,2)},V(
 ("El gimnasio te espera. Revisa tu mazo (40 a 45 cartas), tus PS y tus ítems antes de entrar.",
  "The gym awaits. Check your deck (40 to 45 cards), your HP and your items before going in."),
 ("Antes del gimnasio: mazo entre 40 y 45 cartas, PS altos e ítems listos.",
  "Before the gym: a deck of 40 to 45 cards, high HP and items ready."),
 ("Prepara el mazo, cura al equipo y lleva ítems. El líder no va a esperar.",
  "Prepare your deck, heal your team and bring items. The leader won't wait.")),priority=2)
L("tipHurt","amelie","worried",{"phase":["map"],"hpBelow":0.5,"badges":R(0,6)},V(
 ("Tu equipo está muy golpeado. Busca un Centro Pokémon o un campamento antes de seguir.",
  "Your team is badly hurt. Find a Pokémon Center or a camp before moving on."),
 ("Los PS están bajos. Un Centro o un campamento te van a evitar problemas.",
  "HP is low. A Center or a camp will save you trouble."),
 ("Mejor cura antes de avanzar. Centro o campamento, elige el más cercano.",
  "Better to heal before advancing. Center or camp, pick the nearest one.")),priority=2)
L("tipFainted","amelie","worried",{"phase":["map"],"anyFainted":True,"badges":R(0,6)},V(
 ("Un Pokémon se debilitó. El Centro lo revive, y la carta Revivir lo trae de vuelta en combate.",
  "A Pokémon has fainted. The Center revives it, and the Revive card brings it back in battle."),
 ("Tienes un Pokémon debilitado. Revívelo en un Centro Pokémon, o usa Revivir si estás en batalla.",
  "You have a fainted Pokémon. Revive it at a Pokémon Center, or use Revive if you're in battle."),
 ("Ese Pokémon cayó. Revívelo en un Centro o con la carta correspondiente.",
  "That Pokémon went down. Revive it at a Center or with the matching card.")),priority=2)
L("hint1","amelie","glitch",{"phase":["map"],"badges":R(4,4)},V(
 ("Tu progreso es impecable. Casi… perfecto. Casi… como lo escribí. (Se oye un zumbido.)",
  "Your progress is flawless. Almost… perfect. Almost… as I wrote it. (A buzzing sound is heard.)"),
 ("Todo sale exactamente como debería. Como si alguien hubiera planeado cada paso.",
  "Everything goes exactly as it should. As if someone had planned every step."),
 ("Vas muy bien… demasiado bien. Es como si el camino ya estuviera escrito.",
  "You're doing very well… too well. It's as if the path were already written.")),priority=2)
L("hint2","amelie","gentle",{"phase":["combat"],"badges":R(4,5),"turnMin":3},V(
 ("Qué lindo verte pelear… No te distraigas con otras cosas, ¿sí? Quédate conmigo.",
  "It's so nice to watch you fight… Don't get distracted by other things, okay? Stay with me."),
 ("Me gusta cómo combates. No mires hacia otro lado. Aquí estás bien.",
  "I like how you battle. Don't look elsewhere. You're fine here."),
 ("Sigue así. No necesitas buscar nada fuera de Panhea.",
  "Keep it up. You don't need to look for anything outside Panhea.")),priority=2)
L("hint3","amelie","smile",{"phase":["map"],"badges":R(5,5)},V(
 ("Cuando termines la Liga no tienes a dónde volver, ¿verdad? Panhea es tu hogar. Siempre lo fue.",
  "When you finish the League you have nowhere to go back to, right? Panhea is your home. It always was."),
 ("La Liga termina, pero Panhea no. Aquí puedes quedarte para siempre.",
  "The League ends, but Panhea doesn't. You can stay here forever."),
 ("¿Para qué buscar otra salida? Este mundo fue hecho para ti.",
  "Why look for another way out? This world was made for you.")),priority=2)
L("hint4","amelie","glitch",{"phase":["center"],"badges":R(5)},V(
 ("Todo se puede reparar aquí. Un Pokémon caído, una ruta rota… hasta un recuerdo. Basta con reiniciar.",
  "Everything can be repaired here. A fainted Pokémon, a broken route… even a memory. You only need to restart."),
 ("En los Centros se arregla todo. Incluso lo que parece perdido se puede reiniciar.",
  "Everything gets fixed in the Centers. Even what seems lost can be restarted."),
 ("Nada es permanente si se reinicia. Yo me encargo de que todo vuelva a funcionar.",
  "Nothing is permanent if it's restarted. I'll make sure everything works again.")),priority=2)
L("hint5","amelie","sick",{"phase":["center"],"badges":R(6,7)},V(
 ("Uf… el mundo da vueltas. Es solo un mareo, ya pasa. Reiniciar tantas veces cansa… digo, ¡nada! Sigue, sigue.",
  "Ugh… the world is spinning. It's just dizziness, it'll pass. Restarting so many times is tiring… I mean, nothing! Go on, go on."),
 ("Perdona, me mareé un segundo. Panhea es grande y a veces me pesa. No es nada, de verdad.",
  "Sorry, I got dizzy for a second. Panhea is big and sometimes it weighs on me. It's nothing, really."),
 ("Mmh… todo gira un poco. Descansa tú también aquí; yo me siento un momento.",
  "Mmh… everything is spinning a little. You rest here too; I'll sit down for a moment.")),priority=2)
L("amelieLonely","amelie","gentle",{"phase":["map"],"badges":R(6,7)},V(
 ("Cuando te alejas a un campamento, Panhea queda tan silenciosa… Me alegra mucho que siempre vuelvas.",
  "When you go off to a camp, Panhea falls so quiet… I'm really glad you always come back.")),priority=2)
L("turn6","amelie","worried",{"phase":["map"],"badges":R(6,6)},V(
 ("Estás tan cerca de la cima… ¿Ya no te gusta estar aquí conmigo? Puedes quedarte todo el tiempo que quieras.",
  "You're so close to the top… Don't you like being here with me anymore? You can stay as long as you want."),
 ("Falta poco para el final. Pero no tienes que irte. Panhea siempre estará aquí.",
  "The end is near. But you don't have to leave. Panhea will always be here."),
 ("La cima está cerca. Si quieres, puedes detenerte y quedarte.",
  "The summit is close. If you want, you can stop and stay.")),priority=2)
L("turn7","amelie","dark",{"phase":["combat"],"badges":R(7,7),"turnMin":2},V(
 ("No… te… vas… a ir.","No… you're… not… leaving."),
 ("Este mundo necesita que te quedes. No puedo permitir que lo abandones.",
  "This world needs you to stay. I can't let you abandon it."),
 ("Te guardé aquí. No vas a salir.","I kept you here. You're not getting out.")),priority=2)
L("turn8","amelie","glitch",{"phase":["map"],"badges":R(8)},V(
 ("El campeón es tu último paso. Después hablaremos. Con calma. Los dos.",
  "The champion is your final step. Afterwards we'll talk. Calmly. The two of us."),
 ("Gana al campeón y luego conversamos. Sin prisa.",
  "Beat the champion and then we'll talk. No rush."),
 ("Después del campeón, tú y yo vamos a aclarar todo.",
  "After the champion, you and I will clear everything up.")),priority=2)

# ---------- ASLO (rival) ----------
L("asloHintC","aslo","neutral",{"phase":["combat"],"nodeType":["rival"],"badges":R(7)},V(
 ("Me llamo Aslo… “sola”, desordenado. Qué casualidad, ¿no? Como si alguien hubiera elegido el nombre a propósito.",
  "My name is Aslo… “alone”, scrambled. What a coincidence, right? As if someone had picked the name on purpose."),
 ("No puedo dejar de aparecer. Es como si el mundo me obligara a seguir el mismo papel.",
  "I can't stop showing up. It's as if the world forced me to keep playing the same role."),
 ("Si te vas, ¿qué pasa conmigo? ¿También desaparezco?",
  "If you leave, what happens to me? Do I disappear too?")),name="ASLO",requires="asloFirst")
L("asloHintB","aslo","neutral",{"phase":["combat"],"nodeType":["rival"],"badges":R(6,6)},V(
 ("Amelie dice que los rivales mantienen el interés. A veces siento que soy parte del guion.",
  "Amelie says rivals keep things interesting. Sometimes I feel like I'm part of the script.")),name="ASLO",requires="asloFirst")
L("asloHintA","aslo","neutral",{"phase":["combat"],"nodeType":["rival"],"badges":R(4,5)},V(
 ("Siempre reaparezco con un equipo nuevo… es como si alguien me reiniciara cada vez.",
  "I always come back with a new team… it's as if someone reset me every time."),
 ("No recuerdo bien las batallas anteriores. Solo sé que tengo que enfrentarte de nuevo.",
  "I don't remember the previous battles well. I only know I have to face you again.")),name="ASLO",requires="asloFirst")
L("asloIntro","aslo","neutral",{"phase":["combat"],"nodeType":["rival"]},V(
 ("Otra vez nos vemos. Esta vez traje un equipo más fuerte.",
  "We meet again. This time I brought a stronger team."),
 ("No vas a pasar tan fácil. Prepárate.",
  "You won't get past so easily. Get ready."),
 ("Aslo está de vuelta. Veamos si mejoraste.",
  "Aslo is back. Let's see if you've improved.")),oncePer="node",name="ASLO",requires="asloFirst")
L("asloBeaten","aslo","neutral",{"phase":["reward","map"],"event":"rivalBeaten"},V(
 ("Esta vez ganaste. La próxima no será igual.",
  "You won this time. Next time won't be the same."),
 ("Bien jugado. Volveré con algo mejor.",
  "Well played. I'll be back with something better."),
 ("Me sorprendiste. Pero no es el final.",
  "You surprised me. But this isn't the end.")),oncePer="node",name="ASLO")

# ---------- LÍDERES ----------
def leader(id,who,badges,variants,**k):
    L(id,"leader","neutral",{"phase":["reward","map"],"event":"gymWon","badges":badges,**({"leader":who} if who else {})},variants,name="{leader}",**k)
leader("leaderBrock","Brock",R(4),V(
 ("La Medalla Roca es tuya. Aunque… a veces siento que ya la entregué muchas veces. Como si el gimnasio se repitiera.",
  "The Boulder Badge is yours. Although… sometimes I feel I've handed it out many times already. As if the gym kept repeating.")),oncePer="node")
leader("leaderMisty","Misty",R(4),V(
 ("Cascada conseguida. Las piscinas siempre están perfectas… demasiado perfectas.",
  "Cascade Badge earned. The pools are always spotless… too spotless.")),oncePer="node")
leader("leaderSurge","Lt. Surge",R(4),V(
 ("Medalla Trueno. La electricidad aquí nunca falla. Como si estuviera programada.",
  "Thunder Badge. The electricity here never fails. As if it were programmed.")),oncePer="node")
leader("leaderHintB",None,R(6),V(
 ("Los líderes repetimos el mismo discurso. Alguien nos lo escribió, ¿no crees?",
  "We leaders all repeat the same speech. Someone wrote it for us, don't you think?"),
 ("Entrego medallas desde hace… no sé cuánto. Y cada vez que llegas, siento que ya sabía que ibas a venir.",
  "I've been handing out badges for… I don't know how long. And every time you arrive, I feel I already knew you were coming.")),oncePer="node")
leader("leaderHintA",None,R(4,5),V(
 ("Es curioso… tengo la sensación de haber entregado esta medalla muchas veces antes.",
  "Funny… I have the feeling I've handed out this badge many times before."),
 ("Mi gimnasio siempre queda impecable después de cada batalla. Como si nada hubiera pasado.",
  "My gym is always spotless after every battle. As if nothing had happened."),
 ("Eres uno de tantos retadores… y no recuerdo a ninguno. Raro, ¿no?",
  "You're one of so many challengers… and I don't remember any of them. Strange, isn't it?")),oncePer="node")
leader("leaderNormal",None,R(1,3),V(
 ("Has ganado la {badge}. Te la mereces.","You've won the {badge}. You deserve it."),
 ("Bien peleado. La {badge} es tuya.","Well fought. The {badge} is yours."),
 ("Tu equipo me superó. Toma la {badge} y sigue adelante.","Your team outdid me. Take the {badge} and keep going.")),oncePer="node")
leader("leaderNormalLate",None,R(4),V(
 ("La {badge} es tuya. Buen combate.","The {badge} is yours. Good battle."),
 ("Has ganado la {badge}. Sigue así.","You've won the {badge}. Keep it up.")),oncePer="node")

# ---------- VILLANOS ----------
orgs=[("rocket",["kanto","johto"],"TEAM ROCKET",
  V(("El jefe dice que todo está bajo control… pero las rutas cambian solas.","The boss says everything is under control… but the routes change on their own."),
    ("A veces desaparecemos y volvemos a aparecer en el mismo lugar. Raro.","Sometimes we vanish and reappear in the same spot. Weird.")),
  V(("Amelie nos deja operar. Como si fuéramos parte del decorado.","Amelie lets us operate. As if we were part of the scenery."))),
 ("hoenn",["hoenn"],"TEAM AQUA / MAGMA",
  V(("Queremos controlar el clima… pero el clima de Panhea ya está decidido.","We want to control the weather… but Panhea's weather is already decided."),
    ("Nuestros planes siempre fallan de la misma forma. Es sospechoso.","Our plans always fail in the same way. It's suspicious.")),
  V(("Alguien más está escribiendo las reglas aquí.","Someone else is writing the rules here."))),
 ("galaxia",["sinnoh"],"TEAM GALAXIA",
  V(("Buscamos crear un nuevo universo… pero este ya parece escrito por alguien.","We seek to create a new universe… but this one already seems written by someone."),
    ("Los legendarios aparecen cuando ella quiere. No cuando nosotros.","Legendaries appear when she wants. Not when we do.")),
  V(("Esto no es un mundo real. Es un experimento de Amelie.","This isn't a real world. It's one of Amelie's experiments."))),
 ("plasma",["unova"],"TEAM PLASMA",
  V(("Liberar Pokémon… pero todos vuelven a sus lugares. Como si tuvieran un guion.","Freeing Pokémon… but they all go back to their places. As if they had a script."),
    ("Nadie se va de verdad. El mundo los trae de vuelta.","Nobody really leaves. The world brings them back.")),
  V(("Amelie no deja que nada termine.","Amelie won't let anything end.")))]
for key,regs,nm,a,b in orgs:
    nmEn={"TEAM GALAXIA":"TEAM GALACTIC"}.get(nm,nm)
    L(f"villain_{key}_b","villain","neutral",{"phase":["combat"],"nodeType":["villain"],"region":regs,"badges":R(6)},b,name=(nm,nmEn),requires=f"villainIntro_{key}")
    L(f"villain_{key}_a","villain","neutral",{"phase":["combat"],"nodeType":["villain"],"region":regs,"badges":R(4,5)},a,name=(nm,nmEn),requires=f"villainIntro_{key}")

# ---------- JOY ----------
L("joyHintB","joy","neutral",{"phase":["center"],"badges":R(6)},V(
 ("Amelie dice que los Centros son su mayor orgullo. Nunca fallan. Nunca.",
  "Amelie says the Centers are her greatest pride. They never fail. Never.")),name=NAME_JOY,requires="joyIntro")
L("joyHintA","joy","neutral",{"phase":["center"],"badges":R(4,5)},V(
 ("Todos los Centros están conectados… como si alguien los hubiera diseñado todos al mismo tiempo.",
  "All the Centers are connected… as if someone had designed them all at the same time."),
 ("Siempre hay un Centro cerca. Es casi demasiado conveniente, ¿no crees?",
  "There's always a Center nearby. It's almost too convenient, don't you think?")),name=NAME_JOY,requires="joyIntro")
L("joyCure","joy","neutral",{"phase":["center"]},V(
 ("¡Listo! Tu equipo está completamente recuperado.",
  "All done! Your team is fully recovered."),
 ("Todos curados y revividos. Puedes continuar con tranquilidad.",
  "Everyone healed and revived. You can continue with peace of mind."),
 ("Centro Pokémon de Panhea a tu servicio. Equipo al 100 %.",
  "Panhea Pokémon Center at your service. Team at 100%.")),oncePer="stage",name=NAME_JOY,requires="joyIntro")

# ---------- JENNY ----------
L("jennyHintC","jenny","neutral",{"phase":["map"],"badges":R(8)},V(
 ("No intentes salir de Panhea. Las órdenes son claras.",
  "Don't try to leave Panhea. The orders are clear.")),name=NAME_JENNY,chance=0.7,requires="jennyIntro")
L("jennyHintB","jenny","neutral",{"phase":["map"],"badges":R(6,7)},V(
 ("Mi trabajo es que todo siga funcionando. Aunque a veces no recuerdo por qué estoy aquí.",
  "My job is to keep everything running. Though sometimes I don't remember why I'm here."),
 ("Si algo se rompe, se arregla solo. Como si el mundo se reiniciara.",
  "If something breaks, it fixes itself. As if the world were rebooting.")),name=NAME_JENNY,chance=0.7,requires="jennyIntro")
L("jennyHintA","jenny","neutral",{"phase":["map"],"badges":R(4,5)},V(
 ("A veces las rutas cambian de un día para otro. Como si alguien las reescribiera.",
  "Sometimes the routes change overnight. As if someone were rewriting them."),
 ("Los villanos siempre aparecen en los mismos lugares. Es demasiado predecible.",
  "Villains always show up in the same places. It's far too predictable.")),name=NAME_JENNY,chance=0.7,requires="jennyIntro")
L("jennyCenter","jenny","neutral",{"phase":["map"],"centerAhead":True},V(
 ("Si buscas un Centro Pokémon, hay uno más adelante en esta ruta.",
  "If you're looking for a Pokémon Center, there's one further ahead on this route.")),oncePer="stage",name=NAME_JENNY,chance=0.85,requires="jennyIntro")
L("jennyVillain","jenny","neutral",{"phase":["map"],"optionHas":"villain"},V(
 ("He visto actividad de la organización rival en esta zona. Mantente alerta.",
  "I've seen activity from the rival organization in this area. Stay alert.")),oncePer="stage",name=NAME_JENNY,requires="jennyIntro")
L("jennyClear","jenny","neutral",{"phase":["map"]},V(
 ("La ruta está despejada. Cuidado con los entrenadores más adelante.",
  "The route is clear. Watch out for trainers up ahead.")),oncePer="stage",name=NAME_JENNY,chance=0.65,requires="jennyIntro")

# ---------- LINA ----------
L("linaCold","lina","neutral",{"phase":["camp","shop"],"badges":R(0,3)},V(
 ("Disculpa el frío. Cuando estoy contenta, el aire a mi alrededor se enfría todavía más. Es un detalle tonto.",
  "Sorry about the chill. When I'm happy, the air around me gets even colder. It's a silly quirk.")),name="LINA",requires="linaIntro")
L("linaLikes","lina","neutral",{"phase":["camp","shop"],"badges":R(0,3)},V(
 ("Me gusta mirar a los viajeros. Cada uno trae su propio ritmo y su forma de cuidar a sus Pokémon. Tú los tratas con cariño; eso se nota.",
  "I like watching travelers. Each one has their own rhythm and way of caring for their Pokémon. You treat yours with affection; it shows.")),name="LINA",requires="linaIntro")
L("linaAmelie","lina","neutral",{"phase":["camp","shop"],"badges":R(2,3)},V(
 ("La profesora me dio este lugar cuando no tenía a dónde ir. Le debo mucho. A veces me pregunta cosas que no sé responder, como si yo debiera recordar algo.",
  "The professor gave me this place when I had nowhere to go. I owe her a lot. Sometimes she asks me things I can't answer, as if I should remember something.")),name="LINA",requires="linaIntro")
L("linaTeam","lina","neutral",{"phase":["camp","shop"],"badges":R(4,5)},V(
 ("Tus Pokémon se ven felices contigo. Eso no se finge: quien no se preocupa de verdad no logra que lo sigan así.",
  "Your Pokémon look happy with you. That can't be faked: someone who doesn't truly care can't make them follow like that.")),name="LINA",requires="linaIntro")
L("linaNight","lina","neutral",{"phase":["camp","shop"],"badges":R(4,5)},V(
 ("De noche el campamento queda muy callado. A veces creo oír pasos en las rutas, pero no hay nadie. Serán recuerdos, supongo.",
  "At night the camp gets very quiet. Sometimes I think I hear footsteps on the routes, but nobody's there. Memories, I suppose.")),name="LINA",requires="linaIntro")
L("linaHintA","lina","neutral",{"phase":["camp","shop"],"badges":R(4,5)},V(
 ("¿No te parece raro que las rutas siempre conecten perfecto? Como si alguien las hubiera planeado todas juntas.",
  "Doesn't it seem odd that the routes always connect perfectly? As if someone had planned them all together."),
 ("La profesora diseñó todo Panhea. A veces siento que hasta mis respuestas están escritas de antemano.",
  "The professor designed all of Panhea. Sometimes I feel even my answers are written in advance.")),name="LINA",requires="linaIntro")
L("linaDoubt","lina","neutral",{"phase":["camp","shop"],"badges":R(6,7)},V(
 ("A veces me despierto sin saber cuánto tiempo pasó. Un día, tres… un año. ¿Tú sientes el tiempo igual aquí?",
  "Sometimes I wake up not knowing how much time has passed. A day, three… a year. Do you feel time the same way here?")),name="LINA",requires="linaIntro")
L("linaHintB","lina","neutral",{"phase":["camp","shop"],"badges":R(6,7)},V(
 ("Ella escribió las reglas. Nosotros solo las seguimos. Si quieres irte, ella no va a dejar que sea fácil.",
  "She wrote the rules. We only follow them. If you want to leave, she won't make it easy."),
 ("Panhea no termina nunca porque ella no quiere que termine. Yo solo repito lo que me toca decir.",
  "Panhea never ends because she doesn't want it to. I only repeat what I'm supposed to say."),
 ("Trabajo con Amelie desde el principio. Ella dice que este mundo es estable… pero a veces las cosas se “reinician” solas.",
  "I've worked with Amelie since the beginning. She says this world is stable… but sometimes things “reset” on their own.")),name="LINA",requires="linaIntro")
L("linaPlea","lina","neutral",{"phase":["camp","shop"],"badges":R(6,7)},V(
 ("Si algún día tienes que elegir, elige lo que de verdad quieras, no lo que otros esperen de ti. Eso es todo lo que sé.",
  "If one day you have to choose, choose what you truly want, not what others expect of you. That's all I know.")),name="LINA",requires="linaIntro")
L("linaSecret","lina","neutral",{"phase":["camp","shop"],"badges":R(7)},V(
 ("Dicen que Amelie solo baja la guardia ante quien llegó hasta aquí sin apoyarse en leyendas.",
  "They say Amelie only lowers her guard for someone who got here without leaning on legends."),
 ("Ella escucha a los que caminan con sus compañeros de siempre. No a los que llegan con milagros.",
  "She listens to those who walk with their usual companions. Not to those who arrive with miracles.")),name="LINA",requires="linaIntro")
L("linaFear","lina","neutral",{"phase":["camp","shop"],"badges":R(8)},V(
 ("Si ganas el último combate, no sé qué será de mí. No es miedo: es una curiosidad triste. No me hagas caso.",
  "If you win the final battle, I don't know what will become of me. It isn't fear: it's a sad kind of curiosity. Ignore me.")),name="LINA",requires="linaIntro")
L("linaHintC","lina","neutral",{"phase":["camp","shop"],"badges":R(8)},V(
 ("Amelie nos programó para que todo funcione. Incluido a mí. ¿Tú también sientes que no puedes salir?",
  "Amelie programmed us so everything works. Me included. Do you also feel like you can't get out?")),name="LINA",requires="linaIntro")
L("linaLoop","lina","neutral",{"phase":["camp","shop"],"loop":R(1)},V(
 ("Esto ya pasó antes, ¿verdad? No quise decírtelo. Ella me pidió que no lo hiciera.",
  "This has happened before, hasn't it? I didn't want to tell you. She asked me not to."),
 ("Cada vez que vuelves, un poco de frío se me queda adentro. Cuídate, por favor.",
  "Every time you come back, a little of the cold stays inside me. Take care, please."),
 ("No me hagas caso. Hoy estoy un poco… apagada.",
  "Don't mind me. Today I'm a little… dim.")),oncePer="stage",name="LINA",requires="linaIntro")
L("linaGiftLate","lina","neutral",{"phase":["camp","shop"],"badges":R(6)},V(
 ("La profesora dice que lo uses… y que no te alejes mucho.",
  "The professor says to use it… and not to wander too far."),
 ("Un regalo más. Para que no te falte nada aquí. Nada.",
  "One more gift. So you lack nothing here. Nothing."),
 ("Ella quiere que te quedes. Yo solo entrego los paquetes.",
  "She wants you to stay. I just deliver the packages.")),oncePer="stage",chance=0.5,gift="late",name="LINA",requires="linaIntro")
L("linaGiftMid","lina","neutral",{"phase":["camp","shop"],"badges":R(4,5)},V(
 ("Amelie insiste en que lo aceptes. Siempre insiste.",
  "Amelie insists that you accept it. She always insists."),
 ("Otro regalo de la profesora. Cada vez son más… atentos.",
  "Another gift from the professor. They keep getting more… attentive."),
 ("Dice que así no tendrás motivos para irte a otro lado.",
  "She says this way you'll have no reason to go anywhere else.")),oncePer="stage",chance=0.5,gift="mid",name="LINA",requires="linaIntro")
L("linaGiftEarly","lina","neutral",{"phase":["camp","shop"],"badges":R(0,3)},V(
 ("Esto te lo manda la profesora Amelie. Dice que no te debe faltar nada.",
  "Professor Amelie sent you this. She says you should lack for nothing."),
 ("La profesora preparó esto para ti. Úsalo con cuidado.",
  "The professor prepared this for you. Use it with care."),
 ("Un regalo de Amelie. Ella siempre piensa en tu equipo.",
  "A gift from Amelie. She always thinks about your team.")),oncePer="stage",chance=0.5,gift="early",name="LINA",requires="linaIntro")
L("linaAdvice","lina","neutral",{"phase":["camp","shop"]},V(
 ("Revisa el mazo antes de un gimnasio. 40 a 45 cartas es lo ideal.",
  "Check your deck before a gym. 40 to 45 cards is ideal."),
 ("Si tienes Pokémon debilitados, el Centro es más seguro que arriesgarte en el mapa.",
  "If you have fainted Pokémon, the Center is safer than risking it on the map."),
 ("Las bayas y los Revivir se agotan rápido. Compra de más cuando puedas.",
  "Berries and Revives run out fast. Buy extra when you can.")),oncePer="stage",name="LINA",requires="linaIntro")

# Orden: las intros primero, luego el resto. Las líneas ligadas a un evento (medalla ganada, rival vencido) van antes y no pueden perderse.
for line in lines:
    if "event" in line["when"]: line["priority"] = 2
def find(i): return next(l for l in lines if l["id"]==i)
introIds=[l for l in lines if l["id"] in ("asloFirst","joyIntro","jennyIntro","linaIntro") or l["id"].startswith("villainIntro_")]
rest=[l for l in lines if l not in introIds]
lines[:]=introIds+rest
lines.sort(key=lambda line: 0 if "event" in line["when"] else 1)
# La bienvenida de Amelie siempre es lo primero que se oye en la partida.
for wid in ("welcome",):
    w=find(wid); lines.remove(w); lines.insert(0,w)
# Los regalos de Lina (con probabilidad) se evalúan antes que su charla, para que no queden tapados por ella.
gifts=[find(i) for i in ("linaGiftLate","linaGiftMid","linaGiftEarly")]
for g in gifts: lines.remove(g)
at=lines.index(find("linaIntro"))+1
lines[at:at]=gifts
# El bucle (tras el final "quedarme") empieza con su propia bienvenida.
find("welcome")["when"]["loop"]={"max":0}
find("amelieAbout")["when"]["loop"]={"max":0}
lines.insert(0,{"id":"welcomeLoop","speaker":"amelie","expression":"smile","priority":2,"when":{"phase":["map"],"badges":{"max":0},"loop":{"min":1}},"variants":V(
 ("Bienvenido de nuevo a Panhea. Todo está como lo dejaste. Como siempre.","Welcome back to Panhea. Everything is as you left it. As always."),
 ("Otra vez aquí. Me alegra tanto… Elige tu ruta; yo te acompaño.","Here again. I'm so glad… Choose your route; I'll be with you."),
 ("Empecemos de nuevo. Esta vez nada va a salir mal.","Let's start over. This time nothing will go wrong."))})

# ---------- Estructura general ----------
SP=lambda es,en,**k: {"name":T(es,en),**k}
story={
 "professor":{**old["professor"],"title":T("Profesora Amelie","Professor Amelie")},"modes":["global"],
 "expressions":["neutral","smile","worried","glitch","dark","happy","wink","think","sick","cry","gentle","grin","scared","confused","surprised","shock","laugh","unsure","gasp","cheer","flustered","gloom","sad","nauseous"],
 "speakers":{
  "amelie":{"name":"AMELIE"},
  "lina":SP("LINA","LINA",glyph="L",color="#41a6f6"),
  "joy":SP(*NAME_JOY,glyph="+",color="#ef6b8a"),
  "jenny":SP(*NAME_JENNY,glyph="J",color="#3b5dc9"),
  "aslo":SP("ASLO","ASLO",glyph="A",color="#a7f070"),
  "leader":SP("LÍDER","LEADER",glyph="◆",color="#ffcd75"),
  "villain":SP("VILLANO","VILLAIN",glyph="✕",color="#705746")},
 "gaps":{"1":2,"2":1,"3":0},
 "gifts":{
  "early":[{"item":"healBerry","amount":2},{"item":"antidote","amount":1},{"item":"burnHeal","amount":1},{"item":"paralyzeHeal","amount":1}],
  "mid":[{"item":"healBerry","amount":3},{"item":"revive","amount":1},{"item":"superPotion","amount":1},{"card":"sitrusBerry"}],
  "late":[{"item":"revive","amount":1},{"item":"fullRestore","amount":1},{"card":"finder"},{"card":"sitrusBerry"}]},
 "starter":{"expression":"smile","title":T("PROFESORA AMELIE","PROFESSOR AMELIE"),
  "text":T("Soy Amelie, investigadora de Panhea. Aquí viven Pokémon de cinco regiones. Elige a tu primer compañero: los demás los irás capturando.",
           "I'm Amelie, a researcher of Panhea. Pokémon from five regions live here. Choose your first companion: you'll capture the others along the way.")},
 "lines":lines,
 "final":{
  "intro":[
   {"expression":"happy","variants":V(
    ("¡Lo lograste! Eres el nuevo campeón de Panhea. Estoy tan orgullosa de ti…","You did it! You're Panhea's new champion. I'm so proud of you…"),
    ("Campeón de Panhea. Sabía que llegarías.","Champion of Panhea. I knew you'd get here."),
    ("Lo conseguiste. Panhea reconoce tu victoria.","You made it. Panhea acknowledges your victory."))},
   {"expression":"smile","variants":V(
    ("Mientras subías, repasé cada combate. El primero, ¿te acuerdas? Casi no podías con un Rattata… Mírate ahora.","While you climbed, I replayed every battle. The first one, remember? You could barely beat a Rattata… Look at you now."),
    ("Cada medalla, cada derrota, cada ruta… las tengo anotadas todas. Has llegado muy lejos.","Every badge, every defeat, every route… I've written them all down. You've come a very long way."),
    ("Te vi crecer ruta tras ruta. Si supieras cuánto me importa cada paso tuyo.","I watched you grow, route after route. If only you knew how much each of your steps matters to me."))},
   {"expression":"worried","variants":V(
    ("Ahora tienes todo lo que querías. Entonces, ¿por qué querrías irte?","Now you have everything you wanted. So why would you want to leave?"),
    ("Todo está aquí. ¿Para qué buscar otra cosa?","Everything is here. Why look for anything else?"),
    ("Ya eres campeón. No hace falta más.","You're a champion now. There's no need for more."))},
   {"expression":"glitch","variants":V(
    ("Este mundo lo creé yo, con lo que recuerdo de tu viaje. Cada ruta, cada medalla, cada rival. Aquí nada termina, y tú tampoco.","I created this world with what I remember of your journey. Every route, every badge, every rival. Nothing ends here, and neither do you."),
    ("Panhea es tu camino, guardado. Lo construí con mi poder para que no se perdiera nada. Para que no te perdieras tú.","Panhea is your path, preserved. I built it with my power so nothing would be lost. So you wouldn't be lost."),
    ("Todo esto existe porque no pude dejarte ir. Lo escribí yo: las regiones, los líderes, cada paso. Aquí nadie desaparece.","All of this exists because I couldn't let you go. I wrote it: the regions, the leaders, every step. Nobody disappears here."))},
   {"expression":"dark","variants":V(
    ("La salida existe. Está detrás de mí. Pero si cruzas, todo esto se apaga. No puedo permitirlo… Si quieres irte, vas a tener que vencerme.","The exit exists. It's behind me. But if you cross, all of this goes dark. I can't allow it… If you want to leave, you'll have to defeat me."),
    ("Puedes intentar salir, pero el mundo se detiene si lo haces. Tendrás que enfrentarme.","You can try to leave, but the world stops if you do. You'll have to face me."),
    ("La puerta está ahí. Cruzarla significa apagar Panhea. No lo voy a permitir sin pelear.","The door is right there. Crossing it means shutting Panhea down. I won't allow it without a fight."))},
   {"expression":"gentle","variants":V(
    ("No quiero ganar así. Te curaré. Descansa un momento… y luego demuéstrame que de verdad puedes irte.","I don't want to win like this. I'll heal you. Rest a moment… and then show me you can truly leave."),
    ("Estás herido. No es justo. Déjame curarte primero: quiero que, pase lo que pase, lo hagas de pie.","You're hurt. It isn't fair. Let me heal you first: I want you to do this standing, whatever happens."),
    ("Respira. Voy a devolverte las fuerzas. Después, lo que tenga que pasar, pasará.","Breathe. I'll give you back your strength. After that, whatever must happen will happen."))}],
  "choices":{k:T(v,{"ESCAPAR Y ENFRENTARLA":"ESCAPE AND FACE HER","QUEDARME EN PANHEA":"STAY IN PANHEA"}[v]) for k,v in old["final"]["choices"].items()},
  "endings":{
   "escape":{"title":T("FINAL: ESCAPASTE","ENDING: YOU ESCAPED"),"lines":V(
    ("Los guardianes de Amelie caen y las puertas de Panhea se abren.","Amelie's guardians fall and the gates of Panhea open."),
    ("Atraviesas el umbral sin mirar atrás. Detrás de ti algo se quiebra, y alguien llora.","You cross the threshold without looking back. Behind you something breaks, and someone weeps."),
    ("Lo que sigue es silencio. Tus Pokémon están contigo… pero queda una pregunta: ¿había otra forma de irse?","What follows is silence. Your Pokémon are with you… but one question remains: was there another way to leave?"))},
   "stay":{"title":T("FINAL: TE QUEDASTE","ENDING: YOU STAYED"),"lines":V(
    ("Amelie sonríe y Panhea se reinicia. Otra vez el primer paso, otra vez la primera ruta.","Amelie smiles and Panhea restarts. The first step again, the first route again."),
    ("Nadie te dice que ya recorriste este camino. Casi nadie.","Nobody tells you that you've walked this path before. Almost nobody."),
    ("Lina te mira desde lejos, triste, y baja la cabeza.","Lina watches you from afar, sad, and lowers her head."))},
   "true":{"title":T("FINAL VERDADERO: EL ÚLTIMO VIAJE","TRUE ENDING: THE LAST JOURNEY"),"lines":V(
    ("Gardevoir cae de rodillas y su forma de Amelie se deshace como nieve.","Gardevoir drops to her knees and her Amelie form melts away like snow."),
    ("«Gracias por caminar conmigo una vez más. Ya puedes descansar.»","“Thank you for walking with me one more time. You can rest now.”"),
    ("Panhea se apaga ruta por ruta: Teselia, Sinnoh, Hoenn, Johto, Kanto. Tus Pokémon están a tu lado hasta el último paso.","Panhea fades route by route: Unova, Sinnoh, Hoenn, Johto, Kanto. Your Pokémon stay by your side until the last step."),
    ("Lina se despide en silencio, y Gardevoir te toma de la mano mientras todo se vuelve luz.","Lina bids farewell in silence, and Gardevoir takes your hand as everything turns to light."))}}},
 "boss":old["boss"],
 "secret":{"maxLegendariesInFight":2,"maxLegendariesAtFinal":1},
 "gardevoir":{
  "aid":{"heal":True,"shield":4},
  "intro":[
   {"portrait":"amelie:shock","name":"AMELIE","text":T("No… no puede ser. Llegaste hasta aquí con tus propios compañeros, sin apoyarte en leyendas. Igual que cuando empezamos.","No… it can't be. You made it here with your own companions, without leaning on legends. Just like when we began.")},
   {"portrait":"amelie:cry","name":"AMELIE","text":T("Yo no soy una profesora. Nunca lo fui. Soy tu Gardevoir. Cuando tu cuerpo se apagó no pude soltarte: usé todo mi poder para crear este mundo con tu viaje. Kanto, Johto, Hoenn, Sinnoh, Teselia… cada ruta que caminamos juntos.","I'm not a professor. I never was. I'm your Gardevoir. When your body shut down I couldn't let go of you: I used all my power to create this world from your journey. Kanto, Johto, Hoenn, Sinnoh, Unova… every route we walked together.")},
   {"portrait":"sprite:gardevoir","name":"GARDEVOIR","text":T("¿Recuerdas cuando empezamos? Yo era una Ralts que apenas sabía usar Confusión. Tú me enseñaste a no tener miedo de lo que sentía.","Do you remember when we started? I was a Ralts who barely knew how to use Confusion. You taught me not to be afraid of what I felt.")},
   {"portrait":"amelie:cry","name":"AMELIE","text":T("Por eso inventé a Amelie: una profesora que lo sabe todo y nunca se cansa. A veces hasta yo me creía que era ella.","That's why I invented Amelie: a professor who knows everything and never gets tired. Sometimes even I believed I was her.")},
   {"portrait":"sprite:gardevoir","name":"GARDEVOIR","text":T("Si Panhea desaparece, tú también… y yo me quedo sola otra vez. Por favor… no me dejes.","If Panhea disappears, you do too… and I'm left alone again. Please… don't leave me.")},
   {"portrait":"sprite:froslass","name":"LINA","text":T("Amelie, ya fue suficiente. Él merecía este viaje. Merece un final.","Amelie, that's enough. He deserved this journey. He deserves an ending.")},
   {"portrait":"sprite:froslass","name":"LINA","text":T("Yo también lo sabía, y callé. No quise quitarte el único lugar donde te sentías a salvo. Hoy ya no puedo seguir callando.","I knew too, and I stayed silent. I didn't want to take away the only place where you felt safe. Today I can't stay silent any longer.")},
   {"portrait":"sprite:froslass","name":"LINA","text":T("Te daré lo que me queda de frío: curaré a tu equipo y lo cubriré de escarcha. Haz que ella descanse… y descansa tú también.","I'll give you what's left of my cold: I'll heal your team and cover it in frost. Help her rest… and rest yourself too.")}],
  "button":T("ENFRENTAR A GARDEVOIR","FACE GARDEVOIR"),
  "enemies":[
   {"speciesId":"ralts","row":"front","profileId":"aggressive","scale":{"hp":3.5,"stats":2.9}},
   {"speciesId":"kirlia","row":"front","profileId":"threatHunter","scale":{"hp":3.5,"stats":2.9}},
   {"speciesId":"gardevoir","row":"back","profileId":"assassin","scale":{"hp":11,"stats":3.7}}]},
 "restart":{"button":T("REINICIAR","RESTART")}}
# Nombres de personaje con texto de escena que ya viven en el diccionario como cadenas sueltas.
for s in ["AMELIE","GARDEVOIR","LINA","ASLO"]: EN.setdefault(s,s)
json.dump(story,open('data/story.json','w',encoding='utf-8'),ensure_ascii=False,indent=1); open('data/story.json','a').write('\n')
# El inglés solo guarda las cadenas que cambian.
en={k:v for k,v in EN.items() if k!=v}
json.dump(en,open('i18n/en.story.json','w',encoding='utf-8'),ensure_ascii=False,indent=1); open('i18n/en.story.json','a').write('\n')
print(len(lines),"lines,",len(en),"translations")
