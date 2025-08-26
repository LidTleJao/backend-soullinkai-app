// import  app  from "./src/index";
// // import { db } from "./src/config/firebase";

// const port = process.env.port || 5000;

// // // server.listen(port, () =>{
// // //     console.log("Server is Open!!!");
// // // });
// app.listen(port, () => {
//   console.log(` Server running on http://localhost:${port}`);
// });

import app from "./src/index";

const port = Number(process.env.PORT) || 5000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
