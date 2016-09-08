module.exports.model = function (objectTemplate, getTemplate)
{
    var Doctor = objectTemplate.create("Doctor", {});
    var Patient = objectTemplate.create("Patient", {});
    var Appointment = objectTemplate.create("Appointment", {});

    Doctor.mixin({
        name:           {type: String},
        appointments:   {type: Array, of: Appointment, value: []},
        init: function (name) {this.name = name}
    });

    Patient.mixin({
        name:           {type: String},
        appointments:   {type: Array, of: Appointment, value: []},
        init: function (name) {this.name = name}
    });

    Appointment.mixin({
        doctor:         {type: Doctor},
        patient:        {type: Patient},
        when:           {type: Date},
        init: function(when, doctor, patient) {
            this.when = when;
            this.doctor = doctor;
            this.patient = patient;
            doctor.appointments.push(this)
            patient.appointments.push(this);
        }
    });

    return {
        Doctor: Doctor,
        Patient: Patient,
        Appointment: Appointment
    }

}

