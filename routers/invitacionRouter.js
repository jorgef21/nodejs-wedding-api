var express = require('express');
var Invitaciones = require('../models/invitaciones');
var router = express.Router();
var invitacionSchema = new Invitaciones();
const P = require('bluebird');
const Liana = require('forest-express-mongoose');
const faker = require('Faker');
const csv = require('csv');
var twilio = require('twilio');
var accents = require('remove-accents');

//Funcion para obtener la fecha local y no la universal
function convertUTCDateToLocalDate(date) {
    var newDate = new Date(date.getTime()+date.getTimezoneOffset()*60*1000);
    var offset = date.getTimezoneOffset() / 60;
    var hours = date.getHours();
    newDate.setHours(hours - offset);
    return newDate;   
}

function SendReminderSMS(phone,nombre){
    const accountSid = process.env.ACCOUNT_SID;
    const authToken =  process.env.AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);   
    var area_code='+52';
    var area_code_us='+1';
    client.messages
    .create({from: '+16672131513', body: 'Hola '+accents.remove(nombre)+'!, Te recordamos que tu asistencia sigue pendiente de confirmar,entra ahora a perlayjorge.com/#rsvp Fecha limite:Dic/01/19', to: area_code_us+phone.toString()})
    .then(message => console.log(message.sid));
    console.log('Message sent to: '+area_code_us+phone);
    client.messages
      .create({from: '+16672131513',body: 'Hola '+accents.remove(nombre)+'!, Te recordamos que tu asistencia sigue pendiente de confirmar,entra ahora a perlayjorge.com/#rsvp  Fecha limite: Dic/01/2019', to: area_code+phone.toString()})
      .then(message => console.log(message.sid));  
    console.log('Message sent to: '+area_code+phone);
}

function SendInviteSMS(phone,nombre){
    const accountSid = process.env.ACCOUNT_SID;
    const authToken =  process.env.AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);   
    var area_code='+52';
    var area_code_us='+1';
    client.messages
    .create({from: '+16672131513',body: 'Hola '+accents.remove(nombre.toString())+
                                        '!, Somos Perla&Jorge, nos complace invitarte a NUESTRA BODA, entra aqui para mas detalles perlayjorge.com'
                                        , to: area_code_us+phone.toString()})
    .then(message => console.log(message.sid));
    console.log('Message sent to: '+area_code_us+phone);
    client
    .messages
    .create({from: '+16672131513', body: 'Hola '+accents.remove(nombre.toString())+
                                         '!, Somos Perla&Jorge, nos complace invitarte a NUESTRA BODA, entra aqui para mas detalles perlayjorge.com'
                                         , to: area_code+phone.toString()})
    .then(message => console.log(message.sid));  
    console.log('Message sent to: '+area_code+phone);
}


//Buscar invitado por nombre, apellido
router.route("/")
.get(function(req, res){
    var fecha = convertUTCDateToLocalDate(new Date());
    //Example: /invitaciones?filter=algo
    if(req.query.filter){
        invitacionSchema.Search(req.query.filter, function(resultado){
            res.send(resultado);
        });
    }else{
        res.send(fecha);
    }
	
})
.post(function(req,res){
	invitacionSchema.InvitacionSave(req.body, function(resultado){
		res.send(resultado);
	});
});

//Metodo para quitar los acentos
router.route("/updatefullname").get(function(req,res){
    invitacionSchema.NombresSinAcento(function(resultado){
        res.send(resultado);
    });
})

//Obtener codigo de confirmacion por email o telefono
router.route("/code")
.get(function(req,res){
    var fecha = convertUTCDateToLocalDate(new Date());
    //Example: /invitaciones/code?filter=algo
    if(req.query.email){
        invitacionSchema.GenerarCodigoConfirmacion(req.query.email, function(resultado){
            res.send(resultado);
        });
    }
    else{
        if(req.query.telefono){
            invitacionSchema.ValidarInvitacionSMS(req.query.telefono, function(resultado){
                res.send(resultado);
            });
        }else{
            res.send(fecha);
        }
        
    }
})
.post(function(req,res){
  invitacionSchema.ValidarCodigoConfirmacion(req.body, function(resultado){
    res.send(resultado);
  });
});

//Enviar recordatorio a invitados sin confirmar por SMS
router.route("/actions/send-sms")
.post(function(req,res){
      let invitacionId = req.body.data.attributes.ids[0];
      var telefono = 0;
      const accountSid = process.env.ACCOUNT_SID;
      const authToken =  process.env.AUTH_TOKEN;
      const client = require('twilio')(accountSid, authToken);
      console.log(invitacionId);

    Invitaciones.findById(invitacionId)
    .lean().exec(function(err,results){
           try{
                console.log(results)
                telefono = results.telefono;
                nombre = results.nombre;
                console.log("length: "+telefono.toString().length)
                if(typeof telefono === "undefined" || telefono === null){
                   res.status(400).send({error:'No se encontro telefono asociado'});
                   console.log("Telefono vacio")
                }else{
                    if(telefono.toString().length < 10){
                     res.status(400).send({error:'Telefono invalido !!'});
                     console.log("Telefono: "+telefono)
                    }else{
                     console.log("Telefono: "+telefono)
                     SendReminderSMS(telefono,nombre);   
                     res.send({success:'Mensaje Enviado !'});    
                    }
                    
                }
            }catch(err){
                console.log("error")
            }
    })
    
});

//Confirmar invitados
router.route("/confirmar")
.post(function(req,res){
  invitacionSchema.ConfirmarInvitados(req.body, function(resultado){
    res.send(resultado);
  });
});

//Mover invitado de lista pendiente.
router.route("/actions/invitado-mover").post(Liana.ensureAuthenticated, (req, res) => {
  let invitacionId = req.body.data.attributes.ids[0];
  var ids = req.body.data.attributes.ids;
  console.log(ids)
  var ObjectId = require('mongodb').ObjectID; 
  
  for (var i = ids.length - 1; i >= 0; i--) {
    console.log(ids[i])
    Invitaciones.findOneAndUpdate({ _id: ObjectId(ids[i])}, { $set: { status: 1 }})
    .then();
   } 
     res.send({ success: 'Invitado transferido!' }); 
});

//
router.route("/actions/send-invite-sms")
.post(function(req,res){
      let invitacionId = req.body.data.attributes.ids[0];
      var telefono = 0;
      const accountSid = process.env.ACCOUNT_SID;
      const authToken =  process.env.AUTH_TOKEN;
      const client = require('twilio')(accountSid, authToken);
      var ids = req.body.data.attributes.ids;
      var ObjectId = require('mongodb').ObjectID;
      console.log(invitacionId);
 
    Invitaciones.findById(invitacionId)
    .lean().exec(function(err,results){
           try{
                console.log(results)
                telefono = results.telefono;
                nombre = results.nombre;
                console.log("length: "+telefono.toString().length)
                if(typeof telefono === "undefined" || telefono === null){
                   res.status(400).send({error:'No se encontro telefono asociado'});
                   console.log("Telefono vacio")
                }else{
                    if(telefono.toString().length < 10){
                     res.status(400).send({error:'Telefono invalido !!'});
                     console.log("Telefono: "+telefono)
                    }else{
                     console.log("Telefono: "+telefono)
                     for (var i = ids.length - 1; i >= 0; i--) {   
                     Invitaciones.findOneAndUpdate({ _id: ObjectId(ids[i])}, { $set: {invitacion_enviada: true}}).
                     then(() => SendInviteSMS(telefono,nombre));
                     }
                     res.send({success:'Mensaje Enviado !'});
                    }
                     
                    
                }
            }catch(err){
                console.log("error: " +err.toString())
            }
    })
    
    
});

//Ocultar nombres del frontEnd
router.route("/actions/ocultar-nombres").post(Liana.ensureAuthenticated, (req, res) => {
  let invitacionId = req.body.data.attributes.ids[0];

  return Invitaciones
    .findOneAndUpdate({ _id: invitacionId }, { $set: { invitacion_dinamica: true }})
    .then(() => res.send({ success: 'Nombres ocultos en FrontEnd!' }));
});


module.exports = router;
