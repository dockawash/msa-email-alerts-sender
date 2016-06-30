'use strict';

/**
 * @description
 * Envoyeur d'email d'alertes vers le personnel de Montupet
 * Les alertes sont généré par Meta4 et alimente la table
 * M4CFR_ALERTS_TO_SEND
 *
 * Le programme lit la table et fait le envoi de email puis
 * met à jour les enregistrements lut en mettant à jour la
 * coche CFR_CK_ALERT_SENDED à 1 et la date d'envoi CFR_DT_SEND.
 *
 * @require
 * nodemailer                   - https://github.com/nodemailer/nodemailer
 * node-email-templates         - https://github.com/niftylettuce/node-email-templates
 * ejs                          - https://github.com/mde/ejs
 * node-mssql                   - https://github.com/patriksimek/node-mssql
 */
var fs         = require('fs');
var glob       = require('glob');
var util       = require('util');
var Promise    = require('promise');
var mssql      = require('mssql');
var nodemailer = require('nodemailer');
var ejs        = require('ejs');

/**
 * SMTP
 */
var smtpConfig = {
    host: 'clsesa12.montupet.com',
    port: 25,
    secure: false
};

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport(smtpConfig);

// recup email test
// var ejsFileTemplateEmail = __dirname + "/test-template.ejs";
// var ejsTemplateEmail = fs.readFileSync(ejsFileTemplateEmail, 'utf8');
var ejsTemplateEmail;

/**
 * Récupération des requetes SQL
 */
var sqlFileAlertsToSend = __dirname + "/select-alerts-to-send.sql";
var sqlAlertToSend = fs.readFileSync(sqlFileAlertsToSend, 'utf8');

var sqlFileEmailRespWu = __dirname + "/select-email-responsable-wu.sql";
var sqlEmailRespWu = fs.readFileSync(sqlFileEmailRespWu, 'utf8');

/**
 * Variables de traitements
 */
var listAlertsToSend, listEmailRespWu, objectAlertsSender, objectEmailRespWu;
var countEmailToSend, countEmailSended;
var isDebug = true;    // pour indiquer si on est en mode debug ou non

/**
 * Variable de connection aux bases de données
 */
var dbProd  = "mssql://M4PROD:5D7TMNO41A@CLSESA57/M4PROD";
var dbPprod = "mssql://M4PPROD:9i3YkKk39C@CLSESA50/M4PPROD";
var dbRec   = "mssql://M4REC:jfT6EJ236n@CLSESA50/M4REC";
var dbRep   = "mssql://M4REP:8qv759SaFR@CLSESA50/M4REP";
var dbFor   = "mssql://M4FOR:9W3dq9F4dj@CLSESA50/M4FOR";
var dbDev   = "mssql://M4DEV:5ZvS64s6Ar@CLSESA50/M4DEV";

/**
 * Traitement principale
 */
mssql
.connect(dbDev)
.then(function() {
    var request = new mssql.Request();
    // request.verbose = true;
    request.query(sqlAlertToSend)
        .then(function(recordset) {
            listAlertsToSend = recordset;
            request.query(sqlEmailRespWu)
                .then(function(recordset) {
                    listEmailRespWu = recordset;
                    main();
                });
        });
}).catch(function(err) {
    console.log('ERROR CONNECT: ', err);
});

/**
 * FIN
 */
//process.exit();

///////////////////////////////////////////////////////////////////////////////
/// FUNCTIONS
///////////////////////////////////////////////////////////////////////////////

/**
 * Traitement apres le SQL
 */
function main() {
    // Liste des responsalbes d'UT et leurs email
    createRespWuEmailObject();
    if (isDebug) console.log(util.inspect(objectEmailRespWu, false, null));

    // Création de l'objet d'envoi de mail
    createSenderObject();
    if (isDebug) console.log(util.inspect(objectAlertsSender, false, null));

    // Envoi des emails
    //emailSenderFromObject();
    console.log('countEmailToSend', countEmailToSend);

    // FIN
    if (countEmailToSend == 0) process.exit();
    else endProcess();
}

/**
 * Liste des responsalbes d'UT et leurs email
 * et créé un objet pour contenir les email par UT
 */
function createRespWuEmailObject() {
    if (listEmailRespWu.length == 0) return;
    objectEmailRespWu = {};
    listEmailRespWu.forEach(function(row, idx) {
        objectEmailRespWu[ row.STD_ID_WORK_UNIT ] = {
            SCO_ID_HR : row.SCO_ID_HR,
            STD_EMAIL : row.STD_EMAIL
        };
    });
}

/**
 * Création de l'objet d'envoi de mail
 * par ALERT et DESTINATAIRE
 */
function createSenderObject() {
    if (listAlertsToSend.length == 0) return;
    var currentAlert    = "",
        currentReceiver = "";
    var objAlert    = null,
        objReceiver = null;

    objectAlertsSender = [];
    listAlertsToSend.forEach(function(row, idx) {
        var thisAlert    = row.CFR_ID_ALERT.replace(/ /g,'_'),
            thisReceiver = row.CFR_ID_RECEIVER.replace(/ /g,'_');

        // Ajoute une alerte à envoyer
        // infos de l'email
        if (thisAlert !== currentAlert) {
            if (objReceiver !== null) objAlert.RECEIVER.push(objReceiver);
            if (objAlert !== null) objectAlertsSender.push(objAlert);

            currentAlert = thisAlert;
            currentReceiver = "";

            objAlert = {
                CFR_ID_ALERT: row.CFR_ID_ALERT,
                CFR_NM_ALERT: row.CFR_NM_ALERT,
                CFR_ID_TYPE_ALERT: row.CFR_ID_TYPE_ALERT,
                CFR_EMAIL_SENDER: row.CFR_EMAIL_SENDER,
                CFR_EMAIL_SUBJECT: row.CFR_EMAIL_SUBJECT,
                CFR_EMAIL_BODY: row.CFR_EMAIL_BODY,
                RECEIVER: []
            };
            objReceiver = null;
        }

        // Ajoute un destinataire pour l'alerte
        // infos du destinataire
        if (thisReceiver !== currentReceiver) {
            if (objReceiver !== null) objAlert.RECEIVER.push(objReceiver);

            currentReceiver = thisReceiver;
            objReceiver = {
                CFR_ID_RECEIVER: row.CFR_ID_RECEIVER,
                CFR_NM_RECEIVER: row.CFR_NM_RECEIVER,
                CFR_EMAIL_RECEIVER: row.CFR_EMAIL_RECEIVER,
                CFR_ID_SUB_LEG_ENT: row.CFR_ID_SUB_LEG_ENT_REC,
                CFR_ID_WORK_UNIT: row.CFR_ID_WORK_UNIT_REC,
                CFR_CK_WU_RESPONSABLE: row.CFR_CK_WU_RESPONSABLE,
                CFR_ID_HR_REC: row.CFR_ID_HR_REC,
                STD_N_FAM_NAME_1_REC: row.STD_N_FAM_NAME_1_REC,
                STD_N_FIRST_NAME_REC: row.STD_N_FIRST_NAME_REC,
                ALERTS_HR: []
            };
        }

        /**
         * Alerte type 01: alerte sur le personnel
         */
        if (row.CFR_ID_TYPE_ALERT == "01") {
            // Ajoute un enreg HR pour le receveur
            // infos du salarie
            if (thisAlert == currentAlert && thisReceiver == currentReceiver) {
                objReceiver.ALERTS_HR.push({
                    CFR_ID_HR: row.CFR_ID_HR,
                    CFR_OR_HR_PERIOD: row.CFR_OR_HR_PERIOD,
                    STD_N_FAM_NAME_1: row.STD_N_FAM_NAME_1,
                    STD_N_FIRST_NAME: row.STD_N_FIRST_NAME,
                    CFR_ID_SUB_LEG_ENT: row.CFR_ID_SUB_LEG_ENT,
                    CFR_ID_WORK_UNIT: row.CFR_ID_WORK_UNIT,
                    STD_N_WORK_UNIT: row.STD_N_WORK_UNIT,
                    STD_DT_END_PERIOD: row.STD_DT_END_PERIOD,
                    SFR_DT_END_TEST: row.SFR_DT_END_TEST
                });
            }
        }

        /**
         * Alerte type 02: alerte envoi de fichier attaché
         */
        if (row.CFR_ID_TYPE_ALERT == "02" && row.CFR_FILES_ATTACH !== null) {
            var listFilesAttached;
            var arrayFilesAttached = row.CFR_FILES_ATTACH.split(',');
            // listFilesAttached = glob.sync(arrayFilesAttached);
            // console.log(listFilesAttached);
        }
    });

    if (objReceiver !== null) objAlert.RECEIVER.push(objReceiver);
    if (objAlert !== null) objectAlertsSender.push(objAlert);
}

/**
 * Envoi des mails
 */
function emailSenderFromObject() {
    var objectAlert, objectReceiver;
    countEmailToSend = 0;
    countEmailSended = 0;

    // Boucle sur les alertes
    for (var key in objectAlertsSender) {
       objectAlert = objectAlertsSender[key];
       if (isDebug) console.log(util.inspect(objectAlert, false, null));

       // BODY de l'email
       ejsTemplateEmail = objectAlert.CFR_EMAIL_BODY;

        // Boucle sur les destinataires si il y en a
        for (var key2 in objectAlert.RECEIVER) {
            // Récupération de l'objet pour le destinataire
            objectReceiver = objectAlert.RECEIVER[ key2 ];

            // Ajout des helpers
            objectReceiver.capitalize = capitalize;
            objectReceiver.formatDate = formatDate;
            if (isDebug) console.log(util.inspect(objectReceiver, false, null));

            // rendered ejs body
            var emailHtml = ejs.render(ejsTemplateEmail, objectReceiver);
            if (isDebug) console.log(emailHtml);

            // setup e-mail data
            var emailOptions = {
                from: objectAlert.CFR_EMAIL_SENDER,
                to: objectReceiver.CFR_EMAIL_RECEIVER,
                subject: objectAlert.CFR_EMAIL_SUBJECT,
                html: emailHtml
            };
            if (isDebug) console.log(util.inspect(emailOptions, false, null));

            // Envoi de l'email
            // transporter.verify(function(error, success) {
            //     if (error) {
            //         console.log('ERREUR: Server is not ready!', error);
            //     } else {
            //         if (isDebug) console.log('Server is ready to take our messages');
                    countEmailToSend++;
                    // send mail with defined transport object
                    transporter.sendMail(emailOptions, function(error, info){
                        if(error){
                            return console.log('ERREUR: Envoi du email', error);
                        }
                        countEmailSended++;
                        if (isDebug) console.log('Message sent: ' + info.response);
                    });
            //     }
            // });
        }
    }
}

/**
 * Fonction pour terminer le traitement
 */
function endProcess() {
    if (countEmailSended >= countEmailToSend && countEmailToSend > 0) return process.exit();
    return setTimeout(endProcess, 300);
}


///////////////////////////////////////////////////////////////////////////////
/// HELPERS
///////////////////////////////////////////////////////////////////////////////
function capitalize( str ) {
    if (str.length == 0) return "";
    return str.slice(0,1).toUpperCase() + str.slice(1).toLowerCase();
}

// format date dd/mm/yyyy
function formatDate( dt ) {
  function pad(s) { return (s < 10) ? '0' + s : s; }
  return [pad(dt.getDate()), pad(dt.getMonth()+1), dt.getFullYear()].join('/');
}
