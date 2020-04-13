var app = new Vue({
  el: "#app",
  data() {
    return {
      invalidCredentials: false,
      code: "",
    };
  },
  methods: {
    onSubmit() {
      fetch("/login", {
        method: "POST",
        body: JSON.stringify({ code: app.code }),
        headers: {
          "Content-Type": "application/json",
        },
      }).then(function (response) {
        if (response.status == 200) {
          response.json().then((data) => {
            localStorage.setItem("code", data.user);
            window.location.href = `/rooms/controlled/${data.room}`;
          });
        } else if (response.status == 401) {
          app.invalidCredentials = true;
        }
      });
    },
  },
});
