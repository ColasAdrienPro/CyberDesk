# CyberDesk - Resume des fonctionnalites

CyberDesk est une application web de gestion de cybercafe. Elle permet a un gerant de piloter son parc informatique, ses clients et les reservations de postes, tout en donnant aux clients un espace personnel pour consulter leur compte, reserver un ordinateur et signaler une panne.

## Roles utilisateurs

### Gerant

Le gerant administre un cybercafe complet. Il peut :

- creer un compte gerant avec le nom du cybercafe, le SIRET, un mot de passe et un nom de responsable optionnel ;
- se connecter avec son SIRET et son mot de passe ;
- acceder a une console d'administration protegee par session ;
- gerer les clients, ordinateurs, affectations, pannes et reservations de son propre cybercafe uniquement ;
- se deconnecter.

### Client

Le client est rattache a un gerant. Il peut :

- se connecter avec son email et son mot de passe ;
- acceder a son tableau de bord personnel ;
- consulter ses informations de compte et le cybercafe auquel il appartient ;
- voir le poste qui lui est attribue, si un poste lui a ete assigne ;
- reserver un creneau sur un poste disponible ;
- annuler ses propres demandes ou reservations ;
- signaler une panne sur son poste assigne.

## Authentification et securite

- Les mots de passe gerants et clients sont hashes avec `bcrypt`.
- Les sessions sont stockees cote serveur avec `express-session`.
- Une session ne peut pas etre a la fois gerant et client.
- Les routes gerant sont protegees par `authguard`.
- Les routes client sont protegees par `clientAuthguard`.
- Les donnees sont filtrees par `managerId` pour eviter qu'un gerant ou un client accede aux informations d'un autre cybercafe.
- Les validations de formulaires sont centralisees avec `zod`.

## Tableau de bord gerant

Le dashboard gerant affiche une vue d'ensemble du cybercafe :

- nombre total d'ordinateurs ;
- nombre de sessions actives, c'est-a-dire les postes avec un client assigne ;
- nombre de clients ;
- nombre de postes hors service ;
- apercu du parc informatique avec les etats disponible, occupe ou en panne ;
- liste des pannes signalees avec la raison indiquee ;
- bouton pour marquer une panne comme corrigee ;
- liste des clients recents ;
- acces rapide a la page des reservations.

## Gestion des clients

Le gerant dispose d'une page de gestion des clients. Elle permet :

- d'afficher les clients sous forme de cartes sur mobile et de tableau sur desktop ;
- d'ajouter un client avec prenom, nom, email, mot de passe, age optionnel et genre optionnel ;
- de modifier les informations d'un client ;
- de changer le mot de passe d'un client uniquement si un nouveau mot de passe est saisi ;
- de supprimer un client ;
- de voir si un client est assigne a un terminal ;
- de conserver une base clients separee par cybercafe.

Lors de la suppression d'un client :

- ses reservations sont supprimees ;
- le poste qui lui etait assigne est libere ;
- le client est ensuite supprime.

## Gestion des ordinateurs

Le gerant dispose d'un inventaire des terminaux. Il peut :

- ajouter un ordinateur avec un nom et une adresse MAC ;
- modifier le nom ou l'adresse MAC d'un ordinateur ;
- supprimer un ordinateur ;
- voir les compteurs de terminaux, postes disponibles et postes occupes ;
- consulter l'adresse MAC, l'utilisateur actuel et l'etat de chaque poste ;
- assigner un client disponible a un poste libre ;
- liberer un poste sans supprimer le client ;
- voir les postes signales en panne ;
- marquer un poste comme repare.

Les adresses MAC sont validees au format `XX:XX:XX:XX:XX:XX` et normalisees en majuscules avec des deux-points.

## Gestion des pannes

Un client peut declarer une panne depuis son dashboard si un poste lui est attribue. Le signalement :

- demande une raison obligatoire ;
- refuse les raisons trop courtes ;
- limite la raison a 500 caracteres ;
- marque le poste comme en panne ;
- conserve la raison de panne.

Le gerant peut ensuite voir la panne depuis le dashboard ou l'inventaire, puis la marquer comme corrigee. Cette action remet le poste en etat fonctionnel et efface la raison de panne.

## Reservations et calendrier

Les reservations utilisent FullCalendar avec une interface en francais. Le calendrier propose :

- une vue jour, semaine et mois ;
- une vue hebdomadaire par defaut ;
- des horaires de 08:00 a 22:00 ;
- des creneaux de 30 minutes ;
- un indicateur de l'heure actuelle ;
- des evenements colores selon leur statut.

### Reservations cote client

Le client peut :

- voir toutes les reservations validees de son cybercafe ;
- voir ses propres demandes en attente ;
- choisir un poste non casse ;
- choisir une date, une heure de debut et une duree ;
- envoyer une demande de reservation ;
- annuler ses propres reservations ou demandes ;
- voir qu'un creneau est deja reserve par un autre client, sans pouvoir le supprimer.

Une reservation creee par un client commence avec le statut `PENDING`. Elle doit etre validee par le gerant.

### Reservations cote gerant

Le gerant peut :

- voir toutes les reservations de son cybercafe ;
- creer directement une reservation validee pour un client et un poste ;
- consulter les demandes client en attente ;
- valider une demande client ;
- supprimer une reservation ;
- voir les informations de client, poste et statut dans les evenements.

Une reservation creee par le gerant est directement au statut `APPROVED`.

## Regles metier des reservations

- Un poste casse ne peut pas etre reserve.
- Un creneau dans le passe est refuse.
- La date de debut doit etre avant la date de fin.
- Les reservations approuvees bloquent les chevauchements de creneaux.
- Plusieurs demandes en attente peuvent viser le meme poste et le meme creneau ; le gerant decide laquelle valider.
- Lors de la validation d'une demande, le serveur reverifie que le poste n'est pas casse et que le creneau est encore disponible.

## API JSON principale

L'application expose plusieurs endpoints JSON utilises par le calendrier :

- `GET /api/client/computers` : liste les postes reservables par le client.
- `GET /api/manager/computers` : liste les postes reservables par le gerant.
- `GET /api/manager/clients` : liste les clients du gerant pour le formulaire de reservation.
- `GET /api/client/reservations` : charge les reservations visibles par le client.
- `POST /api/client/reservations` : cree une demande de reservation client.
- `DELETE /api/client/reservations/:reservationId` : annule une reservation appartenant au client.
- `GET /api/manager/reservations` : charge toutes les reservations du gerant.
- `POST /api/manager/reservations` : cree une reservation approuvee par le gerant.
- `DELETE /api/manager/reservations/:reservationId` : supprime une reservation du gerant.
- `GET /api/manager/reservations/pending` : liste les demandes en attente.
- `PATCH /api/manager/reservations/:reservationId/approve` : valide une demande client.

## Donnees gerees

### Manager

- nom du cybercafe ;
- SIRET unique ;
- mot de passe hashe ;
- nom du manager optionnel ;
- clients, ordinateurs et reservations associes.

### Client

- prenom ;
- nom ;
- email unique ;
- mot de passe hashe ;
- age optionnel ;
- genre optionnel ;
- manager de rattachement ;
- poste actuellement attribue, si existant ;
- reservations.

### Computer

- nom du poste ;
- adresse MAC unique ;
- etat de panne ;
- raison de panne optionnelle ;
- manager proprietaire ;
- client assigne optionnel ;
- reservations associees.

### Reservation

- date et heure de debut ;
- date et heure de fin ;
- statut `PENDING` ou `APPROVED` ;
- date de creation ;
- manager ;
- client ;
- ordinateur reserve.

## Interface et experience utilisateur

- Application rendue avec Twig.
- Assets statiques servis depuis `public`.
- Design responsive avec affichage adapte mobile et desktop.
- Modales pour l'ajout et la modification des clients et ordinateurs.
- Messages d'erreur affiches dans les formulaires.
- Confirmations avant les suppressions, annulations et actions sensibles.
- Navigation differente selon que l'utilisateur est connecte comme gerant ou client.

## Technologies utilisees

- Node.js et Express pour le serveur.
- Twig pour les vues.
- Prisma avec MySQL/MariaDB pour la base de donnees.
- Zod pour la validation.
- Bcrypt pour le hash des mots de passe.
- Express-session pour les sessions.
- FullCalendar pour les calendriers de reservations.
- Tailwind CSS et CSS personnalise pour l'interface.
