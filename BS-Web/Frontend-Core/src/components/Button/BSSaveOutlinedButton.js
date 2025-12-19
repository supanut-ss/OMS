import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';

const BSSaveOutlinedButton = styled(Button)(({ theme }) => ({
  borderColor: theme.palette.custom?.saveButton || theme.palette.primary.main,
  color: theme.palette.custom?.saveButton || theme.palette.primary.main,
  '&:hover': {
    borderColor: theme.palette.custom?.saveButton || theme.palette.primary.main,
    backgroundColor: theme.palette.custom?.saveButton || theme.palette.primary.main,
    color: theme.palette.mode === 'dark' ? '#000000' : '#FFFFFF',
  },
  '&.Mui-focusVisible': {
    borderColor: theme.palette.primary.dark,
    backgroundColor: theme.palette.primary.dark,
    color: theme.palette.mode === 'dark' ? '#000000' : '#FFFFFF',
  },
  '&:active': {
    borderColor: theme.palette.primary.dark,
    backgroundColor: theme.palette.primary.dark,
    color: theme.palette.mode === 'dark' ? '#000000' : '#FFFFFF',
  }
}));

export default BSSaveOutlinedButton;
