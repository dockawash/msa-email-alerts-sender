/**
 * @description:
 * Envoyeur d'email d'alertes vers le personnel de Montupet
 * Les alertes sont généré par Meta4 et alimente la table
 * M4CFR_ALERTS_TO_SEND
 *
 * Le programme lit la table et fait le envoi de email puis
 * met à jour les enregistrements lut en mettant à jour la
 * coche CFR_CK_ALERT_SENDED à 1 et la date d'envoi CFR_DT_SEND.
 *
 *
 */

