import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';

const BSCloseOutlinedButton = styled(Button)(({ theme }) => ({
  borderColor: theme.palette.custom?.closeButton || theme.palette.error.main,
  color: theme.palette.custom?.closeButton || theme.palette.error.main,
  '&:hover': {
    borderColor: theme.palette.custom?.closeButton || theme.palette.error.main,
    backgroundColor: theme.palette.custom?.closeButton || theme.palette.error.main,
    color: theme.palette.mode === 'dark' ? '#000000' : '#FFFFFF',
  },
  '&.Mui-focusVisible': {
    borderColor: theme.palette.error.dark,
    backgroundColor: theme.palette.error.dark,
    color: theme.palette.mode === 'dark' ? '#000000' : '#FFFFFF',
  },
  '&:active': {
    borderColor: theme.palette.error.dark,
    backgroundColor: theme.palette.error.dark,
    color: theme.palette.mode === 'dark' ? '#000000' : '#FFFFFF',
  }
}));

export default BSCloseOutlinedButton;
