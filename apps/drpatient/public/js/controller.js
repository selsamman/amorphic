module.exports.controller = function (objectTemplate, getTemplate)
{
    var BaseController = getTemplate('./baseController.js').BaseController;
    var Doctor =         getTemplate('./model.js').Doctor;
    var Patient =        getTemplate('./model.js').Patient;
    var Appointment =    getTemplate('./model.js').Appointment;

    Controller = BaseController.extend("Controller",
        {
            // Main object references
            doctors:        {type: Array, of: Doctor, value: []},
            patients:       {type: Array, of: Patient, value: []},
            selectedDoctor: {type: Doctor},

            // New doctors and patient properties
            doctorName:     {type: String},
            patientName:    {type: String},

            // New appointment properties
            appDoctor:      {type: Doctor},
            appPatient:     {type: Patient},
            appTime:        {type: Date},

            addPatient: {on: "server", body: function () {
                var patient = new Patient(this.patientName);
                this.patients.push(patient);
                this.patientName = "";
            }},

            addDoctor:  {on: "server", body: function () {
                var doctor = new Doctor(this.doctorName)
                this.doctors.push(doctor)
                this.doctorName = "";
            }},

            addAppointment:  {on: "server", body: function () {
                (new Appointment(this.appTime, this.selectedDoctor, this.appPatient));
                this.appTime = null;
            }}
        });

    return {Controller: Controller};
}

