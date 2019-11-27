import React from 'react';
import Badge from '@material-ui/core/Badge';
import Button from '@material-ui/core/Button';
import { makeStyles, withStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  margin: {
    margin: theme.spacing(2)
  },
  padding: {
    padding: theme.spacing(0, 2)
  }
}));

export default function Finalizeds(props) {
  const style = useStyles();

  return props.priority === 0 ? (
    <div
      className="d-inline-block"
      style={{ marginLeft: '5px', marginBottom: '5px' }}
    >
      <Badge
        color="secondary"
        badgeContent={props.value}
        className={style.margin}
      >
        <Button
          size="medium"
          variant="contained"
          style={{ padding: '0px', fontWeight: 'bold' }}
        >
          {props.text}
        </Button>
      </Badge>
    </div>
  ) : !props.starvation ? (
    <div
      className="d-inline-block"
      style={{ marginLeft: '5px', marginBottom: '5px' }}
    >
      <Badge
        color="secondary"
        badgeContent={props.value}
        className={style.margin}
      >
        <StyledButton1
          size="medium"
          variant="contained"
          style={{ padding: '0px', fontWeight: 'bold' }}
        >
          {props.text}
        </StyledButton1>
      </Badge>
    </div>
  ) : (
    <div
      className="d-inline-block"
      style={{ marginLeft: '5px', marginBottom: '5px' }}
    >
      <Badge
        color="primary"
        badgeContent={props.value}
        className={style.margin}
      >
        <StyledButton2
          size="medium"
          variant="contained"
          style={{ padding: '0px', fontWeight: 'bold' }}
        >
          {props.text}
        </StyledButton2>
      </Badge>
    </div>
  );
}

const StyledButton1 = withStyles({
  root: {
    background: 'linear-gradient(45deg, #ffd800 80%, #ffd800 90%)',
    borderRadius: 3,
    border: 0,
    color: 'black',
    height: 24,
    boxShadow: '0 3px 5px 2px rgba(75, 191, 107, .3)'
  },
  label: {
    textTransform: 'capitalize'
  }
})(Button);

const StyledButton2 = withStyles({
  root: {
    background: 'linear-gradient(45deg, #dc3545 80%, #dc3545 90%)',
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
