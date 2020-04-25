//Importamos la libreria de mongoose
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//mongoose.connect("mongodb://cristobal:123456@172.17.0.1:27017/comandasdb");

//Creamos el esquema (tabla) para usuarios
var userSchema = new Schema({
	nombre: {
		type: String,
		require: [true, 'El campo: Nombre, es obligatorio']
	},
	primerApellido: {
		type: String,
		require: [true, 'El campo: Priper apellido, es obligatorio']
	},
	segundoApellido: String,
	username: {
		type: String,
		require: [true, 'El campo: username, es obligatorio'],
		unique: [true, 'El nombre de usuario ya existe'],
		minlength: [5, "EL usuario debe contener minimo 5 caracteres"]
	},
	password: {
		type: String,
		require: [true, 'El campo: Password, es obligatorio'],
		minlength: [5,"La contraseña debe tener minimo 5 caracteres"],
		validate: {
			validator: function(p){
				return this.passwordConfirmation == p;
			},
			message: "Las contraseñas no coinciden"
		}
	},
	tipoUsuario: {
		type: Number,
		require: [true, 'Debe indicar el tipo de usaurio']
	},
	creadoEn : {
		type: Date,
		default: Date.now,
		require: [true, 'Debe ingresar la fecha de creacion']
	},
	actualizadoEn : {
		type: Date,
		default: Date.now
	},
	creadoPor: {
		type: String,
		require: [true, 'Es necesario indicar el campo: creado_por' ]
	},
	actualizadoPor : {
		type: String,
		require : [true, 'Es necesario indicar quien actualizo el campo'],
	},
	status: {
		type: Number,
		default: 0,
		require: [true,"Es necesario indicar el status del usuario"]
	}

});

//El usuario por defecto inicia con 0
// 0 = activo, 1 = inactivo, 2 = borrado logico
userSchema.virtual("passwordConfirmation").get(function(){
	return this.p_c;
}).set(function(password){
	this.p_c = password;
});

//Metodo para realizar el login
userSchema.methods.userLogin = function(body,cb){
	var usuario = body.username;
	console.log(usuario);
	var contra = body.password;
	console.log(contra);
	this.model('USUARIOS').findOne(
		{
			username:usuario, 
			password: contra, 
			status:0
		}, "_id nombre primerApellido segundoApellido username tipoUsuario").then(function(doc){
		if(doc != null){
			cb({
				message: "login correcto",
				object: doc,
				error: null
			});
		}else{
			cb({
				message: "credenciales no valdias",
				object: null,
				error: null
			});
		}
	}, function (err){
		cb({
			message: "Ha ocurrido un error",
			usuario: null,
			error: err
		});
	});
}

//Metodo para guardar un usuario en la base de datos
userSchema.methods.userSave = function(body,cb){
	this.nombre = body.nombre;
	this.primerApellido = body.primerApellido;
	this.segundoApellido = body.segundoApellido;
	this.username = body.username;
	this.password = body.password;
	this.passwordConfirmation = body.passwordConfirmation;
	this.tipoUsuario = body.tipoUsuario;
	this.creadoPor = body.creadoPor;
	this.creadoEn = body.creadoEn;
	this.actualizadoEn = body.actualizadoEn;
	this.save().then(function(doc){
		cb({
			message: "Usuario registrado correctamente",
			object: doc,
			error: null
		});
	},function(err){
		cb({
			message: "Ocurrio un error al registrar al usuario",
			object: null,
			error: err
		});
	});
}

//Es necesario crear el modelo para usarlo en la base de datos
var Usuarios = mongoose.model('USUARIOS', userSchema);


module.exports = Usuarios;