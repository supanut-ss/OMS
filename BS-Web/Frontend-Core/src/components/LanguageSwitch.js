import { IconButton, Tooltip } from "@mui/material";
import en from "../assets/images/en.svg";
import th from "../assets/images/th.svg";
const LanguageSwitch = ({ lang, changeLanguage }) => {
    const handleOpen = (event) => {
        changeLanguage(lang === "en" ? "th" : "en");
    }

    return (
        <>
            <Tooltip title="เปลี่ยนภาษา">
                <IconButton
                    color="inherit"
                    onClick={handleOpen}
                    aria-label="change language"
                    sx={{ borderRadius: 2, p: 1.5 }}
                >
                    {
                        lang === "en" ? (<img alt="en" src={en} style={{ width: 25, height: 25 }} />) :
                        (<img alt="th" src={th} style={{ width: 25, height: 25 }} />)
                    }
                </IconButton>
            </Tooltip>
        </>
    );
};

export default LanguageSwitch;