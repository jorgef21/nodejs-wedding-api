//Importamos la libreria de mongoose
var mongoose = require('mongoose');
//Importamos el objeto Schema
var Schema = mongoose.Schema;
var mail_client = require('../utils/mail.js');
require('mongoose-type-email');
//require twilio api
var twilio = require('twilio');
//remove accents
var accents = require('remove-accents');


var invitaciones = new Schema({
    nombre:{
        type: String,
        require: [true,'El nombre en la invitacion es requerido'],
        minlength: [3, 'La longitud del nombre debe ser de mas de 3 caracteres']
    },
	primer_apellido: {
		type: String,
		require: [true, 'El campo: Primer apellido, es obligatorio']
	},
	segundo_apellido: String,
    telefono:{
        type: Number,
        minlength: [10,'El telefono debe ser minimo 10 digitos']
    },
    email: {
        home: {type: mongoose.SchemaTypes.Email, required: false},
    },
    invitados:[
		{
			nombre: String,
			asistencia: {
				type: Boolean,
				default: false
			}
		}
    ],
    creadoEn : {
		type: Date,
		default: Date.now,
		require: [true, 'Debe ingresar la fecha de creacion']
	},
	actualizadoEn : {
		type: Date,
		default: Date.now
    },
    codigo_confirmacion:{
        type: Number,
        default:0000
    },
    status:{
        type: Number,
        default: 1
    },
    invitados_max: {
        type: Number,
        default: 1
    },
    invitados_confirmados: {
        type: Number,
        default: 0
    },
    invitados_noconfirmados : {
        type: Number,
        default: 0
    },
    invitacion_dinamica: {
        type: Boolean,
        default: false
    },
    invitacion_enviada: {
        type: Boolean,
        default:false
    },
    fullname : {
        type: String
    }
});

//El status sera 1 cuando la invitacion aun no haya sido confirmada
//El status cambiara a 2 cuando la invitacion sea confirmada

//Funcion para generar un numero aleatorio
function getRandomInt(max) {
    return Math.floor(1000 + Math.random() * 9000);
}

//Antes de guardar cualquier invitacion, le asignamos la secuencia
invitaciones.pre('save', function(next){
    var doc = this;
    if(doc.nombre.indexOf('Familia') !== -1){
        doc.invitados_max = doc.invitados.length;
    }else{
        doc.invitados_max = doc.invitados.length+1;
    }
    //Guardando el full name
    var completo = doc.nombre;
    if(doc.hasOwnProperty("primer_apellido")){
        if(doc.primer_apellido !== null){
            completo = completo + " " + doc.primer_apellido;
            if(doc.hasOwnProperty("segundo_apellido")){
                if(doc.segundo_apellido !== null){
                    completo = completo + " " + doc.segundo_apellido;
                }
            }
        }
    }
    doc.fullName =  accents.remove(completo.toString());
	next();
});



//Metodos
invitaciones.methods.InvitacionSave = function(o, callback){
    var model = new InvitacionModel({
        nombre : o.nombre,
        primer_apellido: o.primer_apellido,
        segundo_apellido: o.segundo_apellido,
        telefono: o.telefono,
        email: o.email,
        invitados : o.invitados
    });
    model.save().then(function(doc){
        //Se guardo correctamente
        callback({
            success: true,
            message: "Invitacion creada correctamente",
            object: doc,
            errors: null
        });
    },function(err){
        callback({
            success: false,
            message: "No se pudo guardar la invitacion",
            object: null,
            errors: err
        });
    });
}
//Buscar por filtro nombre
invitaciones.methods.Search = function(filter, callback){
    if(filter !== null && filter !== ""){
        //Buscar por nombre completo
        InvitacionModel.find({$or:[{
                                    'nombre' : new RegExp(filter, 'i')
                                   },
                                   {
                                    'primer_apellido' : new RegExp(filter, 'i')
                                   }, 
                                   {
                                    'fullname' : new RegExp(filter, 'i')
                                   }
                                    ]})
        .limit(3)
        .sort('-nombre')
        .then(function(doc){
            callback({
                success: true,
                message: "Exito",
                object: doc,
                errors: null
            })
        }, function(err){
            callback({
                success: false,
                message: "Ocurrio un error al realizar la busqueda",
                object: null,
                errors: err
            });
        });
    }else{
        callback({
            success: false,
            message: "El filtro de busqueda no puede ser nulo",
            object: null,
            errors: null
        });
    }
}

//Funcion para actualizar el nombre completo quitando acentos
invitaciones.methods.NombresSinAcento = function(callback){
    InvitacionModel.find({}).then(function(docs){
        var errores = 0;
        docs.forEach(doc => {
            var completo = doc.nombre;
            if(doc.hasOwnProperty("primer_apellido")){
                if(doc.primer_apellido !== null){
                    completo = completo + " " + doc.primer_apellido;
                    if(doc.hasOwnProperty("segundo_apellido")){
                        if(doc.segundo_apellido !== null){
                            completo = completo + " " + doc.segundo_apellido;
                        }
                    }
                }
            }
            var _fullname =  accents.remove(completo.toString());
            InvitacionModel.update(
                { _id : doc._id },
                { $set: { "fullname" : _fullname }},
                function(err,response){
                    if(err){
                        errores++;
                    }
                }
            );
        });
        if(errores > 0){
            callback({
                success: false,
                message: "No se han podido actualizar " + errores + " registros" ,
                object: null,
                errors: err
            });
        }else{
            callback({
                success: true,
                message: "Se ha actualizado el campo fullname de todos los registros" ,
                object: null,
                errors: null
            });
        }
    },function(err){
        callback({
            success: false,
            message: "Ocurrio un error al actualizar",
            object: null,
            errors: err
        });
    });
}

//Enviar codigo por email para validar invitacion.
invitaciones.methods.GenerarCodigoConfirmacion = function(filter, callback){
    if(filter !== null && filter !== ""){
        console.log("Filtro: " + filter);
        var codigo = getRandomInt(10000);
        InvitacionModel.findOneAndUpdate({'email.home' : filter}, {$set:{codigo_confirmacion: codigo}},(err,doc) => {
            if(err){
                console.log("Ocurrio el siguiente error: " + err.toString());
                callback({
                    success: false,
                    message: "Ocurrio un error al generar el codigo de confirmacion",
                    object: null,
                    errors: err
                });
            }
            if(doc !== null){
                console.log("Doc: " + doc);
                let info = mail_client.sendMail({
                    from: "info@perlayjorge.com",
                    to: filter,
                    subject: "Confirmación perlayjorge.com",
                    text: "Tu codigo de confirmacion es: " + codigo,
                    template: 'index',
                    context: {
                        nombre : doc.nombre,
                        codigo : codigo,
                        display: 'default',
                        body_text: 'Este es tu codigo de confirmacion:',
                        footer_text:  'Este codigo expira en 5 minutos',
                        display2: 'none'
                   }
                   // html: "<h3>Tu codigo de confirmacion es: <b>"+codigo+"</b></h3>" 
                },function(mail_error,mail_info){
                    if(mail_error){
                        console.log("Ocurrio un error al enviar el correo: "+ mail_error);
                        callback({
                            success: false,
                            message: "Occurio un error al enviar el codigo de confirmacion",
                            object: null,
                            errors: mail_error
                        })
                    }else{
                        //Aqui se envia la respuesta al cliente, una vez que el correo ya fue enviado
                        callback({
                            success: true,
                            message: "Exito",
                            object: mail_info,
                            errors: null
                        });
                    }
                });
            }else{
                callback({
                    success: true,
                    message: "No se encontraron coincidencias",
                    object: null,
                    errors: null
                });
            }
        });
    }else{
        callback({
            success: false,
            message: "El filtro no debe ser nulo",
            object: null,
            errors: null
        });
    }
}

invitaciones.methods.ValidarCodigoConfirmacion = function(req,callback){
    //Validar que el codigo enviado sea igual al que existe en la base de datos
    InvitacionModel.findOne({$or:[{'email.home' : req.email, 'codigo_confirmacion' : req.codigo_confirmacion },{'telefono' : req.telefono, 'codigo_confirmacion' : req.codigo_confirmacion }]}).then(function(doc){
        if(doc !== null){
            callback({
                success: true,
                message: "Exito",
                object: doc,
                errors: null
            });
        }else{
            callback({
                success: true,
                message: "No se encontraron coincidencias",
                object: null,
                errors: null
            });
        }
    }, function(err){
        callback({
            success: true,
            message: "Ocurrio un error al realizar la consulta",
            object: null,
            errors: null
        });
    });  
}

invitaciones.methods.ConfirmarInvitados = function(req,callback){
    var confirmados = 0;
    var invitado ='';
    var new_array = req.invitados.filter(function(o){
        return o.asistencia == true;
    })
    var nconfirm = req.invitados_confirmados;
    var no_confirmados = 0;
    var new_array1 = req.invitados.filter(function(o){
        return o.asistencia == false;
    })
    //Validar cuantos invitados estan confirmados
    if(req.nombre.indexOf('Familia') !== -1){
        confirmados = new_array.length
        no_confirmados = new_array1.length;
        if(new_array.length<1){
            console.log('confirmados: ' +nconfirm);
            confirmados= nconfirm;
        }else{
            confirmados = new_array.length
        }
    }else{
        //Se agrega uno extra
        confirmados = new_array.length + 1;
        no_confirmados = new_array1.length;
    }
    //Se actualizara la invitacion
    //Se cambia el status a 2 que siginifica que la invitacion fue confirmada
    var new_date = Date.now()
    this.model('invitaciones').findByIdAndUpdate(req._id, { $set: { status: 2, invitados: req.invitados, actualizadoEn: new_date,invitados_noconfirmados:no_confirmados ,invitados_confirmados: confirmados }}).then(function(doc){
		callback({
            success: true,
			message: "Exito",
			object: doc,
			errors: null
		});
        if(req.nombre.indexOf('Familia') !== -1){
            invitado = doc.nombre;
        }else{
            invitado = doc.nombre +' '+ doc.primer_apellido;
        }
        var content = new_array.reduce(function(a, b) {
                       return a + b.nombre ;
                      }, '');
        let info = mail_client.sendMail({
                    from: "info@perlayjorge.com",
                    to: "jorge.flores.esc@gmail.com",
                    cc: "perla.norza@gmail.com",
                    subject: invitado+" confirmó su asistencia",
                    text: "Se ah confirmado una invitacion",
                    template: 'confirmation',
                    context:{
                        nombre:    'Perla&Jorge',
                        invitado:  invitado,
                        invitados: new_array,
                        body_text: invitado+' confirmó su asistencia ('+confirmados+')',
                        display:   'none',
                        display2:  'default',
                        footer_text: 'Puedes validar estos datos en el dashboard'
                    }
                   // html: "<h3>Invitados: "+confirmados+" personas  </h3>\
                     //       <div><table><thead><tr><th>INVITADOS</th></tr></thead><tbody>" + content + "</tbody></table></div>    \
                       //         "
                },function(mail_error,mail_info){
                    if(mail_error){
                        console.log("Ocurrio un error al enviar el correo: "+ mail_error);
                        callback({
                            success: false,
                            message: "Occurio un error al enviar el codigo de confirmacion",
                            object: null,
                            errors: mail_error
                        })
                    }else{
                        //Aqui se envia la respuesta al cliente, una vez que el correo ya fue enviado
                        callback({
                            success: true,
                            message: "Exito",
                            object: mail_info,
                            errors: null
                        });
                    }
                });

	}, function(err){
		callback({
            success: false,
			message: "Ocurrio un error al confirmar la invitacion",
			object: null,
			errors: err
		});
	});  
}

//Enviar codigo de confirmacion por SMS
invitaciones.methods.ValidarInvitacionSMS = function(filter, callback){

 if(filter !== null && filter !== ""){
    var codigo = getRandomInt(10000);
  InvitacionModel.findOneAndUpdate({'telefono' : filter}, {$set:{codigo_confirmacion: codigo}},(err,doc) => {
            if(err){
                console.log("Ocurrio el siguiente error: " + err.toString());
                callback({
                    success: false,
                    message: "Ocurrio un error al generar el codigo de confirmacion",
                    object: null,
                    errors: err
                });
            }
            if(doc !== null){
                SendSMS(filter,codigo);
                      callback({
                        success:true,
                        message: "Exito",
                        object:null,
                        errors:null});
             }else{
                callback({
                    success: true,
                    message: "No se encontraron coincidencias",
                    object: null,
                    errors: null
                });
            }
        });

    }

}

//function to send SMS usa number and mx
function SendSMS(phone,code){
    const accountSid = process.env.ACCOUNT_SID;
    const authToken =  process.env.AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);   
    var area_code='+52';
    var area_code_us='+1';
    client.messages
    .create({from: '+16672131513', body: 'Perla&Jorge - Tu codigo de confirmacion es: '+code, to: area_code_us+phone.toString()})
    .then(message => console.log(message.sid));
    console.log('Message sent to: '+area_code_us+phone);
    client.messages
      .create({from: '+16672131513', body: 'Tu codigo de confirmacion es: '+code, to: area_code+phone.toString()})
      .then(message => console.log(message.sid));  
    console.log('Message sent to: '+area_code+phone);
}
var InvitacionModel = mongoose.model('invitaciones', invitaciones);
module.exports = InvitacionModel;
