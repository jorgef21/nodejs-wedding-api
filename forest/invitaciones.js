const Liana = require('forest-express-mongoose');
const models = require('../models/invitaciones');

Liana.collection('invitaciones', {
  fields: [{
    field: 'fullname_forest',
    type: 'String',
    get: (invitacion) => {
      if(invitacion.primer_apellido){
      return invitacion.nombre + ' ' + invitacion.primer_apellido;
      }else{
      return invitacion.nombre;
      }
    }
  }]
});

Liana.collection('invitaciones', {
  fields: [{
    field: 'total_invitados',
    type: 'String',
    get: (invitacion) => {
     if(invitacion.nombre.indexOf('Familia') !== -1){
      return invitacion.invitados.length;
      }else {
      return invitacion.invitados.length+1;
      }
    }
  }]
});

Liana.collection('invitaciones',{
  fields:[{
    field: 'Invitacion_Header',
    type:'String',
    get: (invitacion) =>{
      var max_invitados = invitacion.invitados_max;
       return invitacion.nombre+"("+max_invitados.toString()+")";
    }
  }]

});

Liana.collection('invitaciones',{
   actions: [{
     name:'Pasar a lista de invitados',
     endpoint: '/invitaciones/actions/invitado-mover'
   }]
});

Liana.collection('invitaciones',{
   actions: [{
     name:'Ocultar nombres',
     type:'single',
     endpoint:'/invitaciones/actions/ocultar-nombres'
   }]
 });  

Liana.collection('invitaciones',{
   actions: [{
     name:'Enviar recordatorio SMS',
     type:'single',
     endpoint:'/invitaciones/actions/send-sms',
     httpMethod:'POST'
   }]
 });  

 Liana.collection('invitaciones',{
  actions: [{
    name:'Enviar Invitacion SMS',
    type:'bulk',
    endpoint:'/invitaciones/actions/send-invite-sms',
    httpMethod:'POST'
  }]
}); 