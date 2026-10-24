/** npm run sim:tick — executa simulateUntil(ara) una vegada. */
import { simulateUntil } from "../src/lib/sim/catchup";
import { serviceClient } from "../src/lib/sim/db";

simulateUntil(serviceClient())
  .then((r) => console.log(`tic: ${r.franges} franges noves, ${r.comandes} comandes (des de ${r.desDe})`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
