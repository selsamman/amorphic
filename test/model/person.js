module.exports.person = function (objectTemplate, getTemplate)
{
	var Person;
	Person = objectTemplate.create("Person",
		{
			// Name
			firstName: {type: String, value: "", length: 40, rule: ["name", "required"]},
			middleName: {type: String, value: "", length: 40, rule: "name"},
			lastName: {type: String, value: "", length: 40, rule: ["name", "required"]},

			// Secure data elements never transmitted in both directions
			email: {toServer: false, type: String, value: "", length: 200},

			// Relationships

			init: function (email, first, middle, last) {
				this.firstName = first || "";
				this.middleName = middle || "";
				this.lastName = last || ""
				this.email = email || "";
			},
			getFullName: function() {
				return this.firstName + (this.middleName ? " " + this.middleName  + " ": " ") + this.lastName;
			},
            save: function () {
               return this.persistSave();
            }

		});

	return {
		Person: Person
	}

}
module.exports.person_mixins = function (objectTemplate, requires)
{
	requires.person.Person.mixin(
	{
		projectRoles:           {type: Array, of: requires.project.ProjectRole, value: {}},
		ticketItems:            {type: Array, of: requires.ticket.TicketItem, value: {}}
	});
}


