import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';

const BSCloseOutlinedButton = styled(Button)({
  borderColor: '#F33838',
    color: '#F33838',

    '&:hover': {
      borderColor: '#E00000',
      color: '#E00000',
      backgroundColor: 'transparent'
    },

    '&.Mui-focusVisible': {
      borderColor: '#C80000',
      color: '#C80000'
    },

    '&:active': {
      borderColor: '#B00000',
      color: '#B00000'
    }
});
export default BSCloseOutlinedButton;
