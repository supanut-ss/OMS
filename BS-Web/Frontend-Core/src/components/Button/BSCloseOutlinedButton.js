import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';

const BSCloseOutlinedButton = styled(Button)({
  borderColor: '#F33838',
  color: '#F33838',
  '&:hover': {
    borderColor: '#F33838',
    backgroundColor: '#F33838',
    color: '#FFFFFF',
  },
  '&.Mui-focusVisible': {
    borderColor: '#C80000',
    backgroundColor: '#C80000',
    color: '#FFFFFF',
  },
  '&:active': {
    borderColor: '#B00000',
    backgroundColor: '#B00000',
    color: '#FFFFFF',
  }
});
export default BSCloseOutlinedButton;
