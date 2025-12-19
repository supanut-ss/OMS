import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';

const BSSaveOutlinedButton = styled(Button)({
  borderColor: '#0B9ED0',
  color: '#0B9ED0',
  '&:hover': {
    borderColor: '#0B9ED0',
    backgroundColor: '#0B9ED0',
    color: '#FFFFFF',
  },
  '&.Mui-focusVisible': {
    borderColor: '#087FA8',
    backgroundColor: '#087FA8',
    color: '#FFFFFF',
  },
  '&:active': {
    borderColor: '#066788',
    backgroundColor: '#066788',
    color: '#FFFFFF',
  }
});
export default BSSaveOutlinedButton;
