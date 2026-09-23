import { IconButton, Tooltip } from "@mui/material";
import { motion } from "framer-motion";
import en from "../assets/images/en.svg";
import th from "../assets/images/th.svg";

const languageButtonMotion = {
  whileHover: { scale: 1.08 },
  whileTap: { scale: 0.95 },
  transition: { type: "spring", stiffness: 320, damping: 22 },
};

const LanguageSwitch = ({ lang, changeLanguage }) => {
  const handleOpen = (event) => {
    changeLanguage(lang === "en" ? "th" : "en");
  };

  return (
    <>
      <Tooltip title="เปลี่ยนภาษา">
        <motion.div {...languageButtonMotion}>
          <IconButton
            color="inherit"
            onClick={handleOpen}
            aria-label="change language"
            sx={{ borderRadius: 2, p: 1.5 }}
          >
            {lang === "en" ? (
              <img alt="en" src={en} style={{ width: 25, height: 25 }} />
            ) : (
              <img alt="th" src={th} style={{ width: 25, height: 25 }} />
            )}
          </IconButton>
        </motion.div>
      </Tooltip>
    </>
  );
};

export default LanguageSwitch;
