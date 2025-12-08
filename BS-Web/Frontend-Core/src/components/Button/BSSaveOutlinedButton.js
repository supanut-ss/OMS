import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';

const BSSaveOutlinedButton = styled(Button)({
 borderColor: '#0B9ED0',
  color: '#0B9ED0',
  '&:hover': {
    borderColor: '#0B9ED9',
    color: '#0B9ED9',
    backgroundColor: 'transparent'
  },
  '&.Mui-focusVisible': {
    borderColor: '#087FA8',
    color: '#087FA8',
  },
  '&:active': {
    borderColor: '#066788',
    color: '#066788',
  }
});
export default BSSaveOutlinedButton;
