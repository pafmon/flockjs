var app = new Vue({
  el: "#app",
  data() {
    return {
      invalidToken: false,
      waitingForPeer: false,
      tokenId: "",
    };
  },
  methods: {
    onSubmit() {
      fetch("/registerUser", {
        method: "POST",
        body: JSON.stringify({ tokenId: app.tokenId }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }).then(function (response) {
        if (response.status == 200) {
          app.waitingForPeer = true;
        } else if (response.status == 404) {
          app.invalidToken = true;
        }
      });
    },
  },
});
