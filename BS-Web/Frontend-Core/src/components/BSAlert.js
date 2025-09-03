import { Alert, AlertTitle, Collapse } from "@mui/material";
//success ,info,warning,error
const BSAlert =({
  open = true,
  severity = 'success',
  variant = 'standard',
  title,
  message,
  onClose,
  action,
  icon,
  sx,
  ...rest
})=>{
return (
    <Collapse in={open}>
      <Alert
        severity={severity}
        variant={variant}
        onClose={onClose}
        action={action}
        icon={icon}
        sx={sx}
        {...rest}
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {message}
      </Alert>
    </Collapse>
  );
}
export default BSAlert;