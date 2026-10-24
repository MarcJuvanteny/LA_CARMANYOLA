/** npm run sim:reset-demo — desfà el que hagi canviat el compte de demo, sense tocar l'històric. */
import { serviceClient } from "../src/lib/sim/db";
import { resetDemo } from "../src/lib/sim/demo";

resetDemo(serviceClient())
  .then(() => console.log("demo reiniciada"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
