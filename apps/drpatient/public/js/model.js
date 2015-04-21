module.exports.model = function (objectTemplate, getTemplate)
{
	Doctor = objectTemplate.create("Doctor", {
		name: {type: String}
    });
    Patient = objectTemplate.create("Patient", {
        name: {type: String}
    });
    Appointment = objectTemplate.create("Appointment", {
        doctor:     {type: Doctor},
        patient:    {type: Patient},
        when:       {type: Date},
        init:       function(when, doctor, patient) {
            this.when = when;
            this.doctor = doctor;
            this.patient = patient;
            doctor.appointments.push(this)
            patient.appointments.push(this);
        },
        cancel: function () {
            this.doctor.splice(_.find(this.doctor.appointments), function (a) {return a == this}.bind(this), 1);
            this.patient.splice(_.find(this.patient.appointments), function (a) {return a == this}.bind(this), 1);
        }
    });
    Doctor.mixin({
        appointments:    {type: Array, of: Appointment, value: []},
        init: function (name) {this.name = name}
    });
    Patient.mixin({
        appointments:    {type: Array, of: Appointment, value: []},
        init: function (name) {this.name = name}
    });

    return {
		Doctor: Doctor,
        Patient: Patient,
        Appointment: Appointment
	}

}

