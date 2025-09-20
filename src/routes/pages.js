import Adventure from "../pages/Adventure";
import Fusion from "../pages/Fusion";
import Home from "../pages/Home";
import Inventory from "../pages/Inventory";
import Pvp from "../pages/Pvp";

export const pages = {
  home: { labelKey: "nav.home", component: Home, showInNav: true },
  adventure: { labelKey: "nav.adventure", component: Adventure, showInNav: true },
  fusion: { labelKey: "nav.fusion", component: Fusion, showInNav: true },
  pvp: { labelKey: "nav.pvp", component: Pvp, showInNav: true },
  inventory: { labelKey: "nav.inventory", component: Inventory, showInNav: true },
};


