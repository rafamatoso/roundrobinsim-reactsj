import React from 'react';
import Badge from '@material-ui/core/Badge';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  margin: {
    margin: theme.spacing(2)
  },
  padding: {
    padding: theme.spacing(0, 2)
  }
}));

export default function Process(props) {
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
        <Button
          size="medium"
          variant="contained"
          style={{ padding: '0px', fontWeight: 'bold' }}
        >
          {props.text}
        </Button>
      </Badge>
    </div>
  );
}
