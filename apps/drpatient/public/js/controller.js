module.exports.controller = function (objectTemplate, getTemplate)
{
    // Include the model
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

        // New doctors and patients
        doctorName:     {type: String},
        patientName:    {type: String},

        // New appointment
        appDoctor:      {type: Doctor},
        appPatient:     {type: Patient},
        appTime:        {type: Date},

        // New patient
        addPatient: {on: "server", body: function () {
            var patient = new Patient(this.patientName);
            this.patients.push(patient);
            this.patientName = "";
        }},

        // New Doctore
        addDoctor:  {on: "server", body: function () {
            var doctor = new Doctor(this.doctorName)
            this.doctors.push(doctor)
            this.doctorName = "";
        }},

        // New Appointment
        addAppointment:  {on: "server", body: function () {
            new Appointment(this.appTime, this.selectedDoctor, this.appPatient);
            this.appTime = null;
        }}
    });

    return {Controller: Controller};
}

