import './CustomInput.scss'

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  content: string;
}

function Checkbox({checked, onChange, content}: CheckboxProps) {

  return(
    <label className='label-checkbox'>
      <input 
        type='checkbox'
        className='input-checkbox' 
        checked={checked}
        onChange={onChange}
        />
      {content}
    </label>
  );
}

export default Checkbox;