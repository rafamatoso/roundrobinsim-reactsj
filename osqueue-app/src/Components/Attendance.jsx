import React from 'react';
import { Badge, Button } from '@material-ui/core';
import { makeStyles, withStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  margin: {
    margin: theme.spacing(2)
  },
  padding: {
    padding: theme.spacing(0, 2)
  }
}));

export default function Attendance(props) {
  const style = useStyles();

  return (
    <div
      className="d-inline-block"
      style={{ marginLeft: '5px', marginBottom: '5px' }}
    >
      <Badge
        color="secondary"
        badgeContent={props.value}
        className={style.margin}
      >
        <StyledButton
          size="medium"
          style={{ padding: '0px', fontWeight: 'bold' }}
        >
          {props.text}
        </StyledButton>
      </Badge>
    </div>
  );
}

const StyledButton = withStyles({
  root: {
    background: 'linear-gradient(45deg, #4bbf6b 80%, #4bbf6b 90%)',
    borderRadius: 3,
    border: 0,
    color: 'white',
    height: 24,

    boxShadow: '0 3px 5px 2px rgba(75, 191, 107, .3)'
  },
  label: {
    textTransform: 'capitalize'
  }
})(Button);
