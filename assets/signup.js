var app = new Vue({
  el: "#app",
  data() {
    return {
      errors: [],
      invalidCredentials: false,
      details: {
        mail: "",
        fullName: "",
        nameOfStudies: "",
        gender: null,
        age: null
      },
      submitionOk: false
    };
  },
  methods: {
    checkForm() {
      if (
        app.details.mail &&
        app.details.fullName &&
        app.details.nameOfStudies &&
        app.details.gender &&
        app.details.age
      ) {
        this.errors = [];
        return this.onSubmit();
      }

      this.errors = [];

      if (!app.details.fullName) {
        this.errors.push("Full name required.");
      }
      if (!app.details.mail) {
        this.errors.push("Mail required.");
      }
      if (!app.details.nameOfStudies) {
        this.errors.push("Name of studies required.");
      }
      if (!app.details.gender) {
        this.errors.push("Gender required.");
      }
      if (!app.details.age) {
        this.errors.push("Age required.");
      }

      e.preventDefault();
    },
    onSubmit() {
      fetch("/signup", {
        method: "POST",
        body: JSON.stringify(app.details),
        headers: {
          "Content-Type": "application/json"
        }
      }).then(response => {
        if (response.status == 200) {
          app.submitionOk = true;
        }
      });
    }
  }
});
