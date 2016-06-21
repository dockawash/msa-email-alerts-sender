var nodemailer = require('nodemailer');

var smtpConfig = {
    host: 'clsesa12.montupet.com',
    port: 25,
    secure: false
};

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport(smtpConfig);

// setup e-mail data
var mailOptions = {
    from: '"Sébastien Ray" <sebastien.ray@montupet-group.com>', // sender address
    to: 'ray.sebastien@gmail.com, dockawash@gmail.com', // list of receivers
    subject: 'Test nodemailer', // Subject line
    text: 'Test de nodemailer', // plaintext body
    html: '<b>Test de nodemailer</b>' // html body
};

// verify connection configuration
transporter.verify(function(error, success) {
    if (error) {
        console.log(error);
    } else {
        console.log('Server is ready to take our messages');

        // send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                return console.log(error);
            }
            console.log('Message sent: ' + info.response);
        });
    }
});

// send mail with defined transport object
// transporter.sendMail(mailOptions, function(error, info){
//     if(error){
//         return console.log(error);
//     }
//     console.log('Message sent: ' + info.response);
// });
