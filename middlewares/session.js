var Usuario = require("../models/usuarios");
module.exports = function(req,res, next){
	if(!req.session.user_id){
		res.send({
			message: "Usuario no autorizado"
		});
	}else{
		User.findById(req.session.user_id, function(err, user){
			if(err){
				console.log(err);
				res.redirect("/login");
			}else{
				res.locals = { user: user };
				next();
			}
		})
		next();
	}
}