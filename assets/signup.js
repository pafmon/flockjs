var app = new Vue({
  el: "#app",
  data() {
    return {
      errors: [],
      invalidCredentials: false,
      details: {
        firstName: "",
        surname: "",
        mail: "",
        gender: null,
        birthDate: null,
        subject: "",
        beganStudying: null,
        numberOfSubjects: null,
      },
      submitionOk: false,
    };
  },
  methods: {
    checkForm() {
      if (
        app.details.firstName &&
        app.details.surname &&
        app.details.mail &&
        app.details.gender &&
        app.details.birthDate &&
        app.details.subject &&
        app.details.beganStudying &&
        app.details.numberOfSubjects
      ) {
        this.errors = [];
        return this.onSubmit();
      }

      this.errors = [];

      if (!app.details.firstName) {
        this.errors.push("First name required.");
      }
      if (!app.details.surname) {
        this.errors.push("Surname required.");
      }
      if (!app.details.mail) {
        this.errors.push("Mail required.");
      }
      if (!app.details.gender) {
        this.errors.push("Gender required.");
      }
      if (!app.details.birthDate) {
        this.errors.push("Date of birth required.");
      }
      if (!app.details.subject) {
        this.errors.push("Subject required.");
      }
      if (!app.details.beganStudying) {
        this.errors.push("Year of first enrollement required.");
      }
      if (!app.details.numberOfSubjects) {
        this.errors.push("Number of subjects this year required.");
      }

      e.preventDefault();
    },
    onSubmit() {
      // Because Safari doesn't have input="date"
      // This check is necesary
      console.log(new Date(app.details.birthDate));
      if (
        !(app.details.birthDate instanceof Date) &&
        new Date(app.details.birthDate) === "Invalid Date"
      ) {
        const dateArray = app.details.birthDate.split("/");
        app.details.birthDate = new Date(
          `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}`
        );
      }

      fetch("/signup", {
        method: "POST",
        body: JSON.stringify(app.details),
        headers: {
          "Content-Type": "application/json",
        },
      }).then((response) => {
        if (response.status == 200) {
          app.submitionOk = true;
        }
      });
    },
  },
});
